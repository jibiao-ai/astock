package config

import "os"

type Config struct {
	ServerPort    string
	GinMode       string
	DBDriver      string
	DBHost        string
	DBPort        string
	DBUser        string
	DBPassword    string
	DBName        string
	RabbitMQHost  string
	RabbitMQPort  string
	RabbitMQUser  string
	RabbitMQPass  string
	JWTSecret     string
	AdminUser     string
	AdminPassword string
}

func Load() *Config {
	return &Config{
		ServerPort:    getEnv("SERVER_PORT", "8080"),
		GinMode:       getEnv("GIN_MODE", "debug"),
		DBDriver:      getEnv("DB_DRIVER", "mysql"),
		DBHost:        getEnv("DB_HOST", "mysql"),
		DBPort:        getEnv("DB_PORT", "3306"),
		DBUser:        getEnv("DB_USER", "quantmind"),
		DBPassword:    getEnv("DB_PASSWORD", "quantmind123"),
		DBName:        getEnv("DB_NAME", "quantmind"),
		RabbitMQHost:  getEnv("RABBITMQ_HOST", "rabbitmq"),
		RabbitMQPort:  getEnv("RABBITMQ_PORT", "5672"),
		RabbitMQUser:  getEnv("RABBITMQ_USER", "guest"),
		RabbitMQPass:  getEnv("RABBITMQ_PASSWORD", "guest"),
		JWTSecret:     getEnv("JWT_SECRET", "quantmind-secret-key-2026"),
		AdminUser:     getEnv("ADMIN_USER", "admin"),
		AdminPassword: getEnv("ADMIN_PASSWORD", "Admin@2026!"),
	}
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}
