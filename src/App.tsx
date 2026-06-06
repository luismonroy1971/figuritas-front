import { Routes, Route, Navigate, useParams } from "react-router-dom";
import FiguTrackApp from "@/components/figutrack-app";
import SharedAlbumView from "@/components/shared-album-view";

function SharedAlbumRoute() {
  const { shareKey, albumId } = useParams();
  const parsedAlbumId = Number(albumId);

  if (!shareKey || !albumId || Number.isNaN(parsedAlbumId)) {
    return <Navigate replace to="/" />;
  }

  return <SharedAlbumView shareKey={shareKey} albumId={parsedAlbumId} />;
}

export default function App() {
  return (
    <Routes>
      <Route element={<FiguTrackApp />} path="/" />
      <Route
        element={<SharedAlbumRoute />}
        path="/compartir/:shareKey/album/:albumId"
      />
      <Route element={<Navigate replace to="/" />} path="*" />
    </Routes>
  );
}
