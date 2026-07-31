package cd.portailmath.exetat.domain;

public enum Difficulty {
    EASY("Facile"),
    INTERMEDIATE("Intermédiaire"),
    HARD("Difficile");

    private final String label;

    Difficulty(String label) {
        this.label = label;
    }

    public String getLabel() {
        return label;
    }
}

