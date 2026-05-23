import { useState } from "react";
import { db } from "@/infrastructure/db/db";
import type { Table as DexieTable } from "dexie";
import {
  Container,
  Card,
  Form,
  Table as RBTable,
  Alert,
  Button,
  Row,
  Col,
} from "react-bootstrap";
import { logError } from "@/services/logger";

type TableData = {
  id: number;
  [key: string]: string | number | boolean | null | undefined;
};
type DbTables = Record<string, DexieTable<TableData, number>>;
type QueryResult = TableData;

const tables = [
  "configs",
  "assetPurposes",
  "loanTypes",
  "holders",
  "sipTypes",
  "buckets",
  "assetClasses",
  "assetSubClasses",
  "goals",
  "accounts",
  "income",
  "cashFlow",
  "assetsHoldings",
  "liabilities",
];

export default function QueryBuilderPage() {
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [whereClause, setWhereClause] = useState("");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const executeQuery = async () => {
    try {
      setError(null);
      let queryResults: QueryResult[] = [];

      // Execute the query based on selected tables
      if (selectedTables.length === 1) {
        // Simple query on a single table
        const tableName = selectedTables[0];
        const collection = (db as unknown as DbTables)[tableName];
        if (!collection) {
          throw new Error(`Invalid table name: ${tableName}`);
        }
        let results = (await collection.toArray()) as TableData[];

        if (whereClause) {
          try {
            // Create a safe function from the where clause
            const filterFn = new Function("item", `return ${whereClause}`) as (
              item: TableData
            ) => boolean;
            results = results.filter(filterFn);
          } catch (error) {
            logError("Where clause error:", { error });
            throw new Error("Invalid where clause");
          }
        }

        queryResults = results;
      } else if (selectedTables.length > 1) {
        // Join query for multiple tables
        const firstTable = (db as unknown as DbTables)[selectedTables[0]];
        let results = (await firstTable.toArray()) as TableData[];

        // Perform joins with other selected tables
        for (let i = 1; i < selectedTables.length; i++) {
          const nextTable = (db as unknown as DbTables)[selectedTables[i]];
          const secondTable = (await nextTable.toArray()) as TableData[];
          results = results.flatMap((item1: TableData) =>
            secondTable
              .filter((item2: TableData) => {
                // Try to find matching ID fields for join
                const joinField = Object.keys(item1).find(
                  (key) => key === `${selectedTables[i]}_id` || key === "id"
                );
                return joinField && item1[joinField] === item2.id;
              })
              .map((item2: TableData) => ({ ...item1, ...item2 }))
          );
        }

        if (whereClause) {
          try {
            const filterFn = new Function("item", `return ${whereClause}`) as (
              item: TableData
            ) => boolean;
            results = results.filter(filterFn);
          } catch (error) {
            logError("Where clause error:", { error });
            throw new Error("Invalid where clause");
          }
        }

        queryResults = results;
      }

      setResults(queryResults);
    } catch (error) {
      setError((error as Error).message);
      setResults([]);
    }
  };

  const getColumns = (results: QueryResult[]) => {
    if (results.length === 0) return [];
    return Object.keys(results[0]);
  };

  return (
    <Container fluid className="flex-grow-1 overflow-auto">
      <Card className="mb-4">
        <Card.Header>Query Builder</Card.Header>
        <Card.Body>
          <Form>
            <Row className="mb-3">
              <Col md={6}>
                <Form.Group controlId="formTables">
                  <Form.Label>Select Tables</Form.Label>
                  <Form.Control
                    as="select"
                    multiple
                    value={selectedTables}
                    onChange={(e) => {
                      const options = Array.from(
                        (e.target as unknown as HTMLSelectElement)
                          .selectedOptions,
                        (option) => option.value
                      );
                      setSelectedTables(options);
                    }}
                  >
                    {tables.map((table) => (
                      <option key={table} value={table}>
                        {table}
                      </option>
                    ))}
                  </Form.Control>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group controlId="formWhereClause">
                  <Form.Label>Where Clause</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Example: item.amount > 1000 && item.type === 'income'"
                    value={whereClause}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setWhereClause(e.target.value)
                    }
                  />
                </Form.Group>
              </Col>
            </Row>
            <Button
              variant="outline-primary"
              onClick={executeQuery}
              disabled={selectedTables.length === 0}
            >
              Execute Query
            </Button>
          </Form>
          {error && (
            <Alert variant="danger" className="mt-3">
              Error: {error}
            </Alert>
          )}
          {results.length > 0 && (
            <RBTable striped bordered hover size="sm" className="mt-4">
              <thead>
                <tr>
                  {getColumns(results).map((column) => (
                    <th key={column}>{column}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((row, index) => (
                  <tr key={index}>
                    {getColumns(results).map((column) => (
                      <td key={column}>
                        {typeof row[column] === "object"
                          ? JSON.stringify(row[column])
                          : String(row[column])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </RBTable>
          )}
          <div className="text-body-secondary mt-3">
            Note: The where clause should be a valid JavaScript expression that
            returns a boolean.
            <br />
            Use <code>item</code> to refer to the current record. Example:{" "}
            <code>item.amount &gt; 1000</code>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
}
