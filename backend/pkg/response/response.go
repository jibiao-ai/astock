package response

import (
	"net/http"
	"reflect"

	"github.com/gin-gonic/gin"
)

type APIResponse struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

func Success(c *gin.Context, data interface{}) {
	// Ensure nil slices are serialized as [] instead of null
	if data == nil {
		data = []interface{}{}
	} else {
		v := reflect.ValueOf(data)
		if v.Kind() == reflect.Slice && v.IsNil() {
			data = []interface{}{}
		}
	}
	c.JSON(http.StatusOK, APIResponse{Code: 0, Message: "success", Data: data})
}

func Error(c *gin.Context, code int, msg string) {
	c.JSON(code, APIResponse{Code: -1, Message: msg})
}

func BadRequest(c *gin.Context, msg string) {
	Error(c, http.StatusBadRequest, msg)
}

func Unauthorized(c *gin.Context, msg string) {
	Error(c, http.StatusUnauthorized, msg)
}

func Forbidden(c *gin.Context, msg string) {
	Error(c, http.StatusForbidden, msg)
}

func InternalError(c *gin.Context, msg string) {
	Error(c, http.StatusInternalServerError, msg)
}
