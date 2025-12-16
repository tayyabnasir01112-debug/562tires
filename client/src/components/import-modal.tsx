import { useState, useCallback } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Upload, FileSpreadsheet, X, Check, AlertCircle, Loader2 } from "lucide-react";

interface ImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface PreviewRow {
  sku: string;
  name: string;
  brand: string;
  size: string;
  quantity: string;
  costPrice: string;
  sellingPrice: string;
  perItemTax: string;
}

export function ImportModal({ open, onOpenChange }: ImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/products/import", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Import failed");
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Import successful",
        description: `${data.imported} products imported successfully.`,
      });
      handleClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
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
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = async (file: File) => {
    const validTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (!validTypes.includes(file.type) && !file.name.endsWith(".csv") && !file.name.endsWith(".xlsx")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a CSV or Excel (.xlsx) file",
        variant: "destructive",
      });
      return;
    }
    
    setFile(file);
    
    // Parse preview (first 5 rows)
    try {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/products/import/preview", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setPreview(data.rows.slice(0, 5));
      }
    } catch (error) {
      console.error("Preview error:", error);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    onOpenChange(false);
  };

  const handleImport = () => {
    if (file) {
      uploadMutation.mutate(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Products</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file to import products into inventory.
            The file should contain columns: SKU, Name, Brand, Size, Quantity, Cost Price, Selling Price, Per-Item Tax.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive
                ? "border-primary bg-primary/5"
                : "border-muted-foreground/25"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop your file here, or
            </p>
            <label>
              <Button variant="outline" asChild>
                <span>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Browse Files
                </span>
              </Button>
              <input
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    handleFile(e.target.files[0]);
                  }
                }}
                data-testid="input-import-file"
              />
            </label>
            <p className="text-xs text-muted-foreground mt-4">
              Supported formats: CSV, XLSX
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setFile(null);
                  setPreview([]);
                }}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {preview.length > 0 && (
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted px-3 py-2 text-sm font-medium">
                  Preview (first 5 rows)
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Brand</TableHead>
                        <TableHead>Size</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Cost</TableHead>
                        <TableHead className="text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-mono text-sm">
                            {row.sku}
                          </TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.brand || "-"}</TableCell>
                          <TableCell className="font-mono">{row.size || "-"}</TableCell>
                          <TableCell className="text-right">{row.quantity}</TableCell>
                          <TableCell className="text-right font-mono">
                            ${parseFloat(row.costPrice || "0").toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            ${parseFloat(row.sellingPrice || "0").toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {uploadMutation.isPending && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing products...
                </div>
                <Progress value={50} />
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleImport}
            disabled={!file || uploadMutation.isPending}
            data-testid="button-import-confirm"
          >
            {uploadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Import Products
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
