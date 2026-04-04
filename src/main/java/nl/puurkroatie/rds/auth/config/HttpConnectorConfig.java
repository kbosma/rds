package nl.puurkroatie.rds.auth.config;

import org.eclipse.jetty.server.ServerConnector;
import org.springframework.boot.jetty.JettyServerCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class HttpConnectorConfig {

    @Bean
    public JettyServerCustomizer httpConnectorCustomizer() {
        return server -> {
            ServerConnector connector = new ServerConnector(server);
            connector.setPort(8082);
            server.addConnector(connector);
        };
    }
}
