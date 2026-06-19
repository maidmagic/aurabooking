"use client";

import { useState, useRef } from "react";
import { Importer, ImporterField, ImportInfo } from "react-csv-importer";
import "react-csv-importer/dist/index.css";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Loader2 } from "lucide-react";

interface ImportResult {
  total: number;
  imported: number;
  duplicates_skipped: number;
  invalid: number;
}

export default function ImportPage() {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const rowsRef = useRef<any[]>([]);

  const handleData = (rows: any[]) => {
    rowsRef.current.push(...rows);
  };

  const handleComplete = async (_info: ImportInfo) => {
    setImporting(true);
    setResult(null);

    try {
      const res = await fetch("/api/import/bulk-insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contacts: rowsRef.current, file_name: "csv-import" }),
      });

      const json = await res.json();
      setResult(json);
    } catch {
      setResult({ total: 0, imported: 0, duplicates_skipped: 0, invalid: 0 });
    } finally {
      setImporting(false);
      rowsRef.current = [];
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-foreground">Import Contacts</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Upload a CSV or Excel file to bulk-import customer contacts. Map your columns, then we&apos;ll handle the rest.
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {importing ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="size-8 animate-spin text-[#7C5CFC]" />
              <p className="text-sm text-muted-foreground">Importing contacts...</p>
            </div>
          ) : result ? (
            <div className="py-8 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-8 text-[#4A7C59]" />
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Import Complete</h3>
                  <p className="text-sm text-muted-foreground">{result.imported} of {result.total} contacts imported</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <DetailCard label="Imported" value={result.imported} color="text-[#4A7C59]" />
                <DetailCard label="Duplicates Skipped" value={result.duplicates_skipped} color="text-[#D97706]" />
                <DetailCard label="Invalid Rows" value={result.invalid} color="text-[#C44E4E]" />
              </div>
              <button
                onClick={() => setResult(null)}
                className="text-sm text-[#7C5CFC] hover:underline font-medium"
              >
                Import another file
              </button>
            </div>
          ) : (
            <Importer
              chunkSize={10000}
              assumeNoHeaders={false}
              dataHandler={handleData}
              onComplete={handleComplete}
            >
              <ImporterField name="name" label="Full Name" />
              <ImporterField name="phone" label="Phone Number" />
              <ImporterField name="email" label="Email Address" />
              <ImporterField name="notes" label="Notes / Message" optional />
            </Importer>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground text-center">
        All imports are logged for audit. Duplicate phone numbers are automatically skipped.
      </p>
    </div>
  );
}

function DetailCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-[#FAF8F5] border border-[#EDE9E3] rounded-lg p-4 text-center">
      <p className={`text-2xl font-semibold ${color} tabular-nums`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
