"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import Papa from "papaparse";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { routeProPath } from "@/lib/routepro/routeProPath";
import { supabase } from "@/lib/supabaseClient";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";

export default function ImportCsvAnalyzePage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewRows, setPreviewRows] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  // Dropzone CSV
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const csvFile = acceptedFiles[0];
    if (!csvFile) return;
    
    setFile(csvFile);
    setErr(null);
    
    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      preview: 5, // Solo prime 5 righe per preview
      complete: (results) => {
        setColumns(results.meta.fields || []);
        setPreviewRows(results.data);
      },
      error: (error) => {
        setErr(`Errore lettura CSV: ${error.message}`);
      }
    });
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.csv']
    },
    maxFiles: 1
  });

  // Funzione per creare rotta da CSV (USA STESSA API dell'import testo!)
  async function onCreateRoute() {
    if (!file) {
      setErr("Seleziona un file CSV");
      return;
    }

    setLoading(true);
    setProgress({ current: 0, total: 100 }); // Placeholder

    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      
      if (!token) {
        router.push("/login");
        return;
      }

      // 1. Leggi TUTTO il file CSV
      const fullData = await new Promise<any[]>((resolve, reject) => {
        Papa.parse(file, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: reject
        });
      });

      // 2. Estrai SOLO indirizzi (prima colonna o cerca "address"/"indirizzo")
      const addressColumn = columns.find(col => 
        col.toLowerCase().includes("address") || 
        col.toLowerCase().includes("indirizzo") ||
        col.toLowerCase().includes("via") ||
        col.toLowerCase().includes("strada")
      ) || columns[0]; // fallback: prima colonna

      // 3. Prepara array indirizzi
      const addresses = fullData
        .map(row => row[addressColumn])
        .filter(Boolean); // Rimuovi vuoti

      if (addresses.length === 0) {
        throw new Error("Nessun indirizzo trovato nel CSV");
      }

      // 4. CHIAMA LA STESSA API dell'import testo!!!
      //    L'API /api/routepro/import/text accetta rawText con UN indirizzo per riga
      const res = await fetch("/api/routepro/import/text", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          rawText: addresses.join("\n") // Converte array in testo
        }),
      });

      const rawText = await res.text();
      let data: any = {};
      try {
        data = rawText ? JSON.parse(rawText) : {};
      } catch {
        data = { _raw: rawText };
      }

      if (!res.ok) {
        throw new Error(
          `Errore import: ${data?.error || res.statusText}\n${data?.detail || ""}`
        );
      }

      const routeId = data?.routeId;
      if (!routeId) {
        throw new Error("routeId mancante nella risposta");
      }

      // 5. Redirect alla rotta creata
      router.push(routeProPath(`/routes/${routeId}/driver`));
      
    } catch (e: any) {
      setErr(e?.message ?? "Errore durante l'import CSV");
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }

  return (
    <main className="min-h-dvh bg-neutral-50 p-3">
      <div className="mx-auto max-w-md space-y-3">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold">RoutePro • Import CSV</div>
          <LogoutButton />
        </div>

        {/* DROPZONE */}
        <Card className="rounded-2xl">
          <CardContent className="p-4">
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-xl p-6 text-center cursor-pointer
                transition-colors
                ${isDragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-neutral-200 hover:border-neutral-300'
                }
              `}
            >
              <input {...getInputProps()} />
              
              {file ? (
                <div className="flex items-center justify-center space-x-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{file.name}</span>
                </div>
              ) : (
                <>
                  <Upload className="h-8 w-8 mx-auto mb-2 text-neutral-400" />
                  <p className="text-sm font-medium">
                    {isDragActive ? "Rilascia il file" : "Carica file CSV"}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Trascina o clicca per selezionare
                  </p>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        {/* PREVIEW (se file caricato) */}
        {previewRows.length > 0 && columns.length > 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold">Anteprima</div>
                <div className="text-xs text-neutral-500">
                  {columns.length} colonne • prime {previewRows.length} righe
                </div>
              </div>
              
              <div className="text-xs text-neutral-600 bg-neutral-50 p-2 rounded-lg">
                <span className="font-medium">Colonna indirizzi rilevata:</span>{" "}
                {columns.find(col => 
                  col.toLowerCase().includes("address") || 
                  col.toLowerCase().includes("indirizzo")
                ) || columns[0] || "Prima colonna"}
              </div>

              <div className="max-h-32 overflow-y-auto text-xs border rounded-lg p-2">
                {previewRows.map((row, i) => {
                  const firstCol = columns[0];
                  return (
                    <div key={i} className="py-1 border-b last:border-0">
                      <span className="text-neutral-500">{i+1}.</span>{" "}
                      {row[firstCol] || "—"}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ERRORI */}
        {err && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 whitespace-pre-wrap">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 mt-0.5" />
              <span>{err}</span>
            </div>
          </div>
        )}

        {/* PROGRESS (durante import) */}
        {progress && (
          <Card className="rounded-2xl bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                <div className="text-sm text-blue-700">
                  Creazione rotta in corso...
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOTTONI AZIONE */}
        <Card className="rounded-2xl">
          <CardContent className="p-4 space-y-3">
            <Button 
              className="w-full" 
              onClick={onCreateRoute}
              disabled={!file || loading}
            >
              {loading ? (
                <>⏳ Creazione rotta...</>
              ) : (
                <>🚀 Importa {file ? `${previewRows.length}+ stop` : "CSV"}</>
              )}
            </Button>

            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => router.push(routeProPath("/import/csv"))}
              disabled={loading}
            >
              ← Indietro
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}