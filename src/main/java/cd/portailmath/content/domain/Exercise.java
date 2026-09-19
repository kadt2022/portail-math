package cd.portailmath.content.domain;

import java.util.Map;

public record Exercise(
        String id,
        String type,
        Map<String, Object> data,
        Map<String, Object> serverData
) {
    public Exercise {
        data = data == null ? Map.of() : Map.copyOf(data);
        serverData = serverData == null ? Map.of() : Map.copyOf(serverData);
    }
}
