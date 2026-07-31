package cd.portailmath;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@SpringBootApplication
@ConfigurationPropertiesScan
public class PortailMathApplication {

    public static void main(String[] args) {
        SpringApplication.run(PortailMathApplication.class, args);
    }
}
