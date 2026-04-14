package com.gameshelf;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GameshelfApplication {

	public static void main(String[] args) {
		SpringApplication.run(GameshelfApplication.class, args);
	}

}
