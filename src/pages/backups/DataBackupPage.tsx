"use client";
import { useState, useEffect } from "react";
import { Button, Container, Row, Col, Card, Spinner } from "react-bootstrap";
import {
  initializeGoogleDrive,
  signInWithGoogleDrive,
  listFiles,
  readFile,
  deleteFile,
  uploadJsonFile,
  type DriveFile,
} from "@/services/googleDrive";
import { logError } from "@/services/logger";

export default function GoogleDriveMode() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);

  // Initialize Google Drive
  useEffect(() => {
    initializeGoogleDrive();
  }, []);

  // Sign in to Google
  const handleSignIn = async () => {
    try {
      await signInWithGoogleDrive();
      setIsAuthenticated(true);
      refreshFiles();
    } catch (error) {
      logError('Sign in failed:', {error});
    }
  };

  // Refresh file list
  const refreshFiles = async () => {
    setLoading(true);
    try {
      const files = await listFiles();
      setFiles(files);
    } catch (error) {
      logError('Failed to list files:', {error});
    }
    setLoading(false);
  };

  // Read a JSON file from Drive
  const handleReadFile = async (fileId: string) => {
    try {
      const content = await readFile(fileId);
      alert("File content:\n" + JSON.stringify(content, null, 2));
    } catch (error) {
      logError('Failed to read file:', {error});
    }
  };

  // Delete a file
  const handleDeleteFile = async (fileId: string) => {
    try {
      await deleteFile(fileId);
      refreshFiles();
    } catch (error) {
      logError('Failed to delete file:', {error});
    }
  };

  // Upload local JSON file
  const handleUploadLocalJson = async () => {
    try {
      const response = await fetch("/data.json");
      const content = await response.json();
      
      const result = await uploadJsonFile(content);
      alert(`File saved! ID: ${result.id}, Name: ${result.name}`);
      
      refreshFiles();
    } catch (error) {
      logError("Upload failed:", {error});
      alert("Failed to upload file. Please try again.");
    }
  };

  return (
    <Container className="py-4">
      <Row className="mb-3">
        <Col>
          {!isAuthenticated ? (
            <Button onClick={handleSignIn}>Sign in with Google</Button>
          ) : (
            <>
              <Button onClick={refreshFiles} className="me-2">
                Refresh Files
              </Button>
              <Button variant="success" onClick={handleUploadLocalJson}>
                Upload data.json
              </Button>
            </>
          )}
        </Col>
      </Row>

      {loading && <Spinner animation="border" />}

      <Row>
        {files.map((file) => (
          <Col md={4} key={file.id} className="mb-3">
            <Card>
              <Card.Body>
                <Card.Title>{file.name}</Card.Title>
                <Button
                  size="sm"
                  className="me-2"
                  onClick={() => handleReadFile(file.id)}
                >
                  Read
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => handleDeleteFile(file.id)}
                >
                  Delete
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </Container>
  );
}
