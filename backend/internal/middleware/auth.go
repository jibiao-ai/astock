package middleware

import (
	"net/http"
	"strings"
	"time"

	"quantmind/internal/model"
	"quantmind/internal/repository"
	"quantmind/pkg/response"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
)

var JWTSecret []byte

func SetJWTSecret(secret string) {
	JWTSecret = []byte(secret)
}

type Claims struct {
	UserID   uint   `json:"user_id"`
	Username string `json:"username"`
	Role     string `json:"role"`
	jwt.RegisteredClaims
}

func GenerateToken(userID uint, username, role string) (string, error) {
	claims := Claims{
		UserID:   userID,
		Username: username,
		Role:     role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(JWTSecret)
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "未提供认证令牌")
			c.Abort()
			return
		}

		tokenString := strings.TrimPrefix(authHeader, "Bearer ")
		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenString, claims, func(t *jwt.Token) (interface{}, error) {
			return JWTSecret, nil
		})

		if err != nil || !token.Valid {
			response.Unauthorized(c, "无效的认证令牌")
			c.Abort()
			return
		}

		c.Set("user_id", claims.UserID)
		c.Set("username", claims.Username)
		c.Set("role", claims.Role)
		c.Next()
	}
}

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists || role.(string) != "admin" {
			response.Forbidden(c, "需要管理员权限")
			c.Abort()
			return
		}
		c.Next()
	}
}

// AuditMiddleware logs all API access for audit
func AuditMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		duration := time.Since(start).Milliseconds()

		userID, _ := c.Get("user_id")
		username, _ := c.Get("username")

		uid, _ := userID.(uint)
		uname, _ := username.(string)

		// Determine module and action from path
		path := c.Request.URL.Path
		module := classifyModule(path)
		action := classifyAction(c.Request.Method)

		status := "success"
		if c.Writer.Status() >= http.StatusBadRequest {
			status = "failed"
		}

		log := model.AuditLog{
			UserID:    uid,
			Username:  uname,
			Module:    module,
			Action:    action,
			Target:    path,
			Detail:    c.Request.Method + " " + path,
			IP:        c.ClientIP(),
			UserAgent: c.Request.UserAgent(),
			Status:    status,
			Duration:  duration,
		}
		repository.DB.Create(&log)
	}
}

func classifyModule(path string) string {
	switch {
	case strings.Contains(path, "/login"):
		return "login"
	case strings.Contains(path, "/agent") || strings.Contains(path, "/chat") || strings.Contains(path, "/conversation"):
		return "agent"
	case strings.Contains(path, "/market") || strings.Contains(path, "/quote") || strings.Contains(path, "/kline"):
		return "market"
	case strings.Contains(path, "/strategy") || strings.Contains(path, "/signal"):
		return "strategy"
	case strings.Contains(path, "/provider") || strings.Contains(path, "/ai-provider"):
		return "admin"
	case strings.Contains(path, "/user"):
		return "admin"
	case strings.Contains(path, "/audit") || strings.Contains(path, "/log"):
		return "audit"
	case strings.Contains(path, "/dashboard") || strings.Contains(path, "/sentiment"):
		return "data"
	default:
		return "other"
	}
}

func classifyAction(method string) string {
	switch method {
	case "GET":
		return "read"
	case "POST":
		return "create"
	case "PUT", "PATCH":
		return "update"
	case "DELETE":
		return "delete"
	default:
		return "other"
	}
}
