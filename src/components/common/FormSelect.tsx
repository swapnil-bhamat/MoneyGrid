import { Form } from "react-bootstrap";

interface FormSelectProps {
  controlId?: string;
  label: string;
  value: number | string | undefined;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { id: number | string; name: string }[]; // Standard shape for our data
  defaultText?: string;
  className?: string; // For margin/padding control
}

export default function FormSelect({
  controlId,
  label,
  value,
  onChange,
  options,
  defaultText,
  className = "mb-3",
}: FormSelectProps) {
  return (
    <Form.Group className={className} controlId={controlId}>
      <Form.Label>{label}</Form.Label>
      <Form.Select value={value} onChange={onChange}>
        <option value={0}>{defaultText || `Select ${label}`}</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>
            {opt.name}
          </option>
        ))}
      </Form.Select>
    </Form.Group>
  );
}
