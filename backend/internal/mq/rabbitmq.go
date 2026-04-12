package mq

import (
	"fmt"
	"log"
	"quantmind/internal/config"

	amqp "github.com/rabbitmq/amqp091-go"
)

var Conn *amqp.Connection
var Channel *amqp.Channel

func InitRabbitMQ(cfg *config.Config) {
	url := fmt.Sprintf("amqp://%s:%s@%s:%s/", cfg.RabbitMQUser, cfg.RabbitMQPass, cfg.RabbitMQHost, cfg.RabbitMQPort)
	var err error
	Conn, err = amqp.Dial(url)
	if err != nil {
		log.Printf("Warning: Failed to connect to RabbitMQ: %v (continuing without MQ)", err)
		return
	}

	Channel, err = Conn.Channel()
	if err != nil {
		log.Printf("Warning: Failed to open RabbitMQ channel: %v", err)
		return
	}

	// Declare queues
	queues := []string{"agent_task", "market_data", "strategy_signal", "audit_log"}
	for _, q := range queues {
		_, err = Channel.QueueDeclare(q, true, false, false, false, nil)
		if err != nil {
			log.Printf("Warning: Failed to declare queue %s: %v", q, err)
		}
	}
	log.Println("RabbitMQ connected and queues declared")
}

func Publish(queue string, body []byte) error {
	if Channel == nil {
		log.Println("RabbitMQ not connected, skipping publish")
		return nil
	}
	return Channel.Publish("", queue, false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        body,
	})
}

func Close() {
	if Channel != nil {
		Channel.Close()
	}
	if Conn != nil {
		Conn.Close()
	}
}
