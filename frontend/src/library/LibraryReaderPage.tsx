import { PdfReader, type PdfReaderLabels } from "@mbuyamba/pdf-reader";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";

import { libraryCatalogue } from "./library-catalogue";
import styles from "./LibraryReaderPage.module.css";

export function LibraryReaderPage() {
  const { bookId } = useParams();
  const { t } = useTranslation("library");
  const navigate = useNavigate();
  const book = libraryCatalogue.find((item) => item.id === bookId);
  if (!book) return <Navigate to="/bibliotheque" replace />;
  const title = t(book.titleKey);
  const labels: PdfReaderLabels = {
    loading: t("reader.loading"), error: t("reader.error"), previous: t("reader.previous"),
    next: t("reader.next"), page: t("reader.page"), of: t("reader.of"),
    zoomOut: t("reader.zoomOut"), zoomIn: t("reader.zoomIn"), contents: t("reader.contents"),
    closeContents: t("reader.closeContents"), contentsLoading: t("reader.contentsLoading"),
    contentsUnavailable: t("reader.contentsUnavailable"), fullscreen: t("reader.fullscreen"), exitFullscreen: t("reader.exitFullscreen"),
    pageMode: t("reader.pageMode"), continuousMode: t("reader.continuousMode"), fitPage: t("reader.fitPage"),
    fitWidth: t("reader.fitWidth"), zoom: t("reader.zoom"),
  };
  return (
    <div className={styles.page}>
      <PdfReader
        url={book.pdfPath}
        title={title}
        subtitle={`${t(book.subjectKey)} · ${t(book.levelKey)}`}
        backLabel={t("reader.back")}
        onBack={() => navigate("/bibliotheque")}
        labels={labels}
      />
    </div>
  );
}
