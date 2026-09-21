package cd.portailmath.resources.web;

import cd.portailmath.resources.application.ResourceCatalogService;
import cd.portailmath.resources.domain.LibraryBook;
import cd.portailmath.resources.web.response.ResourceApiErrorResponse;
import cd.portailmath.resources.web.response.ResourceCatalogResponse;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Distribution contrôlée des ressources pédagogiques : le catalogue dit ce qui
 * existe, les deux autres routes livrent le contenu. Rien ici ne reproduit un
 * moteur de jeu ni un lecteur de livres.
 */
@RestController
@RequestMapping("/api/v1/resources")
public class ResourceApiController {

    private static final String BOOK_NOT_FOUND = "BOOK_NOT_FOUND";
    private static final String BOOK_NOT_FOUND_MESSAGE = "Le livre demandé est introuvable.";

    private final ResourceCatalogService catalogService;
    private final ResourceApiMapper mapper;

    public ResourceApiController(ResourceCatalogService catalogService, ResourceApiMapper mapper) {
        this.catalogService = catalogService;
        this.mapper = mapper;
    }

    @GetMapping
    public ResourceCatalogResponse findCatalog() {
        return new ResourceCatalogResponse(
                catalogService.findAllBooks().stream().map(mapper::toResponse).toList(),
                catalogService.findAllQuestionBanks().stream().map(mapper::toSummary).toList()
        );
    }

    @GetMapping("/books/{bookId}")
    public ResponseEntity<Object> findBook(@PathVariable String bookId, HttpServletRequest request) {
        return catalogService.findBookById(bookId)
                .map(book -> ResponseEntity.<Object>ok(mapper.toResponse(book)))
                .orElseGet(() -> notFound(BOOK_NOT_FOUND, BOOK_NOT_FOUND_MESSAGE, request));
    }

    /**
     * Les livres pèsent plusieurs dizaines de méga-octets et le lecteur les
     * charge page par page. Spring MVC répond lui-même aux requêtes de plage
     * quand le corps est une ressource : il pose Accept-Ranges et renvoie un
     * 206 découpé. Rien à découper à la main ici, seulement à ne pas l'empêcher.
     */
    @GetMapping("/books/{bookId}/file")
    public ResponseEntity<Object> downloadBook(@PathVariable String bookId, HttpServletRequest request) {
        LibraryBook book = catalogService.findBookById(bookId).orElse(null);
        Resource file = book == null ? null : catalogService.findBookFile(bookId).orElse(null);
        if (file == null) {
            return notFound(BOOK_NOT_FOUND, BOOK_NOT_FOUND_MESSAGE, request);
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(
                        HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(book.file()).build().toString()
                )
                .body(file);
    }

    @GetMapping("/game-question-banks/{bankId}")
    public ResponseEntity<Object> findQuestionBank(@PathVariable String bankId, HttpServletRequest request) {
        return catalogService.findQuestionBankById(bankId)
                .map(bank -> ResponseEntity.<Object>ok(bank.data()))
                .orElseGet(() -> notFound(
                        "QUESTION_BANK_NOT_FOUND",
                        "La banque de questions demandée est introuvable.",
                        request
                ));
    }

    private ResponseEntity<Object> notFound(String code, String message, HttpServletRequest request) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND)
                .body(new ResourceApiErrorResponse(code, message, request.getRequestURI()));
    }
}
