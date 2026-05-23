import React from "react";
import { Modal, Button } from "react-bootstrap";

interface SaveConfirmationModalProps {
  show: boolean;
  onHide: () => void;
  onConfirm: () => void;
  isEdit: boolean;
  itemName: string;
  isValid: boolean;
}

export const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({
  show,
  onHide,
  onConfirm,
  isEdit,
  itemName,
  isValid,
}) => {
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static">
      <Modal.Header closeButton className="border-0 pb-0">
        <Modal.Title className="fw-bold">
          Confirm {isEdit ? "Edit" : "Add"}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="pt-2">
        <p className="mb-0">
          Are you sure you want to {isEdit ? "save changes to" : "add"} this{" "}
          {itemName}?
        </p>
      </Modal.Body>
      <Modal.Footer className="border-0 pt-0">
        <Button variant="outline-secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button variant="primary" onClick={onConfirm} disabled={!isValid}>
          {isEdit ? "Save Changes" : "Add"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
