import { useEffect, useRef, useState } from "react";
import apiClient from "../services/apiClient.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export default function AvatarUploader() {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(null);
  const [error, setError] = useState("");
  const [uploadedUrl, setUploadedUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function selectFile(selectedFile) {
    setError("");
    setUploadedUrl("");
    setProgress(null);

    if (!selectedFile) return;
    if (!ALLOWED.includes(selectedFile.type)) {
      setFile(null);
      setPreviewUrl(null);
      setError("Choose a JPEG, PNG, WebP, or GIF image.");
      return;
    }
    if (selectedFile.size > MAX_SIZE) {
      setFile(null);
      setPreviewUrl(null);
      setError("The image must be 5 MB or smaller.");
      return;
    }

    setFile(selectedFile);
    setPreviewUrl(URL.createObjectURL(selectedFile));
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    if (!isUploading) selectFile(event.dataTransfer.files[0]);
  }

  async function upload() {
    if (!file || isUploading) return;

    const formData = new FormData();
    formData.append("avatar", file);
    setIsUploading(true);
    setProgress(0);
    setError("");
    setUploadedUrl("");

    try {
      const response = await apiClient.post("/api/upload", formData, {
        onUploadProgress(event) {
          if (event.total) {
            setProgress(Math.min(100, Math.round((event.loaded * 100) / event.total)));
          }
        },
      });
      setProgress(100);
      setUploadedUrl(new URL(response.data.url, apiClient.defaults.baseURL).href);
    } catch (uploadError) {
      setError(
        uploadError.response?.data?.error ||
          uploadError.message ||
          "The image could not be uploaded.",
      );
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div>
      <div
        className={`drop-zone${isDragging ? " dragging" : ""}`}
        onClick={() => {
          if (!isUploading) inputRef.current.click();
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <p>Drag an image here, or click to choose</p>
        {previewUrl && <img className="preview" src={previewUrl} alt="Selected avatar preview" />}
        <input
          ref={inputRef}
          type="file"
          accept={ALLOWED.join(",")}
          hidden
          onChange={(event) => {
            selectFile(event.target.files[0]);
            event.target.value = "";
          }}
        />
      </div>

      {error && <p className="error" role="alert">{error}</p>}
      <button onClick={upload} disabled={!file || isUploading}>
        {isUploading ? "Uploading..." : "Upload"}
      </button>
      {progress !== null && (
        <div>
          <div className="bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={progress}>
            <div className="fill" style={{ width: `${progress}%` }} />
          </div>
          <p>{progress}%</p>
        </div>
      )}
      {uploadedUrl && (
        <p>
          Upload complete: <a href={uploadedUrl} target="_blank" rel="noreferrer">{uploadedUrl}</a>
        </p>
      )}
    </div>
  );
}
