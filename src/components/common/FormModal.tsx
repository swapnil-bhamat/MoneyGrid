import { Modal, Form, Button } from "react-bootstrap";
import { ReactNode } from "react";

interface FormModalProps {
  show: boolean;
  onHide: () => void;
  onSubmit: (e: React.FormEvent) => void;
  title: string;
  children: ReactNode;
  error?: string;
  isValid?: boolean;
}

const FormModal = ({
  show,
  onHide,
  onSubmit,
  title,
  children,
  error,
  isValid,
}: FormModalProps) => (
  <Modal show={show} onHide={onHide} backdrop="static" centered>
    <Form onSubmit={onSubmit}>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {children}
        {error && (
          <Form.Control.Feedback type="invalid" style={{ display: "block" }}>
            {error}
          </Form.Control.Feedback>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button
          variant="outline-primary"
          type="submit"
          disabled={isValid === false}
        >
          Save
        </Button>
      </Modal.Footer>
    </Form>
  </Modal>
);

export default FormModal;
