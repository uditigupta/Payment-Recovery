import { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FailedPayment, FailureCode } from "@shared/schema";
import {
  FAILURE_LABELS,
  FAILURE_COLORS,
  formatCurrency,
  formatDate,
} from "@/lib/payment-utils";
import { ArrowUpDown, Eye, CheckCircle, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PaymentDetailDialog } from "./payment-detail-dialog";

interface PaymentsTableProps {
  payments: FailedPayment[] | undefined;
  isLoading: boolean;
}

type SortField = "amount" | "payment_date" | "customer_name";
type SortDir = "asc" | "desc";

export function PaymentsTable({ payments, isLoading }: PaymentsTableProps) {
  const [selectedPayment, setSelectedPayment] = useState<FailedPayment | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filterCode, setFilterCode] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("payment_date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const filteredPayments = useMemo(() => {
    if (!payments) return [];
    let result = [...payments];

    if (filterCode !== "all") {
      result = result.filter((p) => p.failure_code === filterCode);
    }

    if (filterStatus === "recovered") {
      result = result.filter((p) => p.recovered);
    } else if (filterStatus === "pending") {
      result = result.filter((p) => !p.recovered);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.customer_name.toLowerCase().includes(q) ||
          p.customer_email.toLowerCase().includes(q) ||
          p.invoice_id.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === "amount") cmp = a.amount - b.amount;
      else if (sortField === "payment_date")
        cmp = new Date(a.payment_date).getTime() - new Date(b.payment_date).getTime();
      else cmp = a.customer_name.localeCompare(b.customer_name);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [payments, filterCode, filterStatus, searchQuery, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const handleDownloadCSV = () => {
    if (!filteredPayments.length) return;
    const headers = ["customer_name", "customer_email", "amount", "currency", "invoice_id", "failure_code", "payment_date", "recovered"];
    const rows = filteredPayments.map((p) =>
      [p.customer_name, p.customer_email, p.amount, p.currency, p.invoice_id, p.failure_code, p.payment_date, p.recovered].join(",")
    );
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "payment_analysis.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-5">
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card data-testid="card-payments-table">
        <CardContent className="p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4 flex-wrap">
            <h3 className="font-semibold" data-testid="text-payments-count">Failed Payments ({filteredPayments.length})</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 w-44"
                  data-testid="input-search"
                />
              </div>
              <Select value={filterCode} onValueChange={setFilterCode}>
                <SelectTrigger className="w-44" data-testid="select-filter-reason">
                  <SelectValue placeholder="All reasons" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All reasons</SelectItem>
                  {Object.entries(FAILURE_LABELS).map(([code, label]) => (
                    <SelectItem key={code} value={code}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-36" data-testid="select-filter-status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="recovered">Recovered</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadCSV}
                disabled={!filteredPayments.length}
                data-testid="button-download-csv"
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                Export
              </Button>
            </div>
          </div>

          {filteredPayments.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-muted-foreground">No payment records found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                Upload a CSV file or adjust your filters
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer select-none pl-5"
                      onClick={() => toggleSort("customer_name")}
                    >
                      <span className="flex items-center gap-1">
                        Customer <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("amount")}
                    >
                      <span className="flex items-center gap-1">
                        Amount <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead
                      className="cursor-pointer select-none"
                      onClick={() => toggleSort("payment_date")}
                    >
                      <span className="flex items-center gap-1">
                        Date <ArrowUpDown className="h-3 w-3" />
                      </span>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-5 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow
                      key={payment.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedPayment(payment);
                        setDialogOpen(true);
                      }}
                      data-testid={`row-payment-${payment.id}`}
                    >
                      <TableCell className="pl-5">
                        <div>
                          <p className="font-medium text-sm">{payment.customer_name}</p>
                          <p className="text-xs text-muted-foreground">{payment.invoice_id}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium tabular-nums">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${FAILURE_COLORS[payment.failure_code as FailureCode]}`}>
                          {FAILURE_LABELS[payment.failure_code as FailureCode]}
                        </span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(payment.payment_date)}
                      </TableCell>
                      <TableCell>
                        {payment.recovered ? (
                          <Badge variant="default" className="bg-emerald-600 text-xs no-default-active-elevate">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Recovered
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs no-default-active-elevate">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPayment(payment);
                            setDialogOpen(true);
                          }}
                          data-testid={`button-view-${payment.id}`}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PaymentDetailDialog
        payment={selectedPayment}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </>
  );
}
