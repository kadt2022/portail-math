package cd.portailmath.resources.domain;

/**
 * Livre du catalogue de la bibliothèque. Les libellés restent des clés i18n :
 * le backend distribue la ressource, le frontend reste responsable de l'affichage.
 */
public record LibraryBook(
        String id,
        String titleKey,
        String descriptionKey,
        String levelKey,
        String subjectKey,
        String formatKey,
        int pages,
        String file
) {
}
