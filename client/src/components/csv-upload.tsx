import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";

export function CsvUpload() {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Upload failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      setSelectedFile(null);
      toast({
        title: "Upload successful",
        description: `${data.count} payment records imported.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
    }
  }, []);

  return (
    <Card data-testid="card-csv-upload">
      <CardContent className="p-5">
        <h3 className="font-semibold mb-3">Import Failed Payments</h3>
        <div
          className={`relative border-2 border-dashed rounded-md p-6 text-center transition-colors ${
            dragActive
              ? "border-primary bg-primary/5"
              : "border-muted-foreground/25"
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          data-testid="drop-zone"
        >
          {selectedFile ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm">{selectedFile.name}</span>
              <Button
                size="icon"
                variant="ghost"
                onClick={() => setSelectedFile(null)}
                data-testid="button-remove-file"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="h-8 w-8 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                Drag & drop a CSV file here, or{" "}
                <label className="text-foreground underline cursor-pointer font-medium">
                  browse
                  <input
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileSelect}
                    data-testid="input-file"
                  />
                </label>
              </p>
              <p className="text-xs text-muted-foreground/70">
                Columns: customer_name, customer_email, amount, currency, invoice_id, failure_code, payment_date
              </p>
            </div>
          )}
        </div>
        {selectedFile && (
          <div className="mt-3 flex justify-end">
            <Button
              onClick={() => uploadMutation.mutate(selectedFile)}
              disabled={uploadMutation.isPending}
              data-testid="button-upload"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Upload className="h-4 w-4 mr-2" />
              )}
              Upload & Analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
