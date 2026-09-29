package cd.portailmath.resources.domain;

import tools.jackson.databind.JsonNode;

/**
 * Banque de questions d'un jeu. Le contenu reste générique : le backend stocke
 * et distribue les données, il ne reproduit pas le moteur de jeu.
 */
public record GameQuestionBank(String id, String gameId, JsonNode data) {
}
