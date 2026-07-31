package cd.portailmath.exetat.domain;

public enum SubjectStatus {
    AVAILABLE("Disponible"),
    COMING_SOON("Bientôt disponible"),
    DISABLED("Désactivée");

    private final String label;

    SubjectStatus(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}

