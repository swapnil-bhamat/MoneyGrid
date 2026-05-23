import { Form, FormControlProps } from "react-bootstrap";
import { numberToWords } from "@/utils/numberUtils";

interface AmountInputProps extends FormControlProps {
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label?: string; // Optional custom label if we want to wrap it in a Group here, but for now we'll just return the control + text
}

export default function AmountInput({ value, onChange, ...props }: AmountInputProps) {
  const numericValue = Number(value);
  const words = numericValue > 0 ? numberToWords(numericValue) : "";

  return (
    <>
      <Form.Control
        type="number"
        value={value}
        onChange={onChange} // Pass the event correctly
        {...props}
      />
      {words && (
        <Form.Text className="text-muted fst-italic w-100">
          {words}
        </Form.Text>
      )}
    </>
  );
}
