import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Trash2,
  DollarSign,
  Calendar,
  Loader2,
} from "lucide-react";
import type { Expense } from "@shared/schema";
import { format } from "date-fns";

const EXPENSE_CATEGORIES = [
  "Supplies",
  "Utilities",
  "Rent",
  "Equipment",
  "Maintenance",
  "Marketing",
  "Insurance",
  "Other",
];

export default function Expenses() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    description: "",
    amount: "",
    category: "",
    paymentMethod: "cash",
    notes: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const { data: expenses, isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: typeof expenseForm) => {
      return apiRequest("POST", "/api/expenses", {
        ...data,
        amount: parseFloat(data.amount).toFixed(2),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({
        title: "Expense added",
        description: "Expense has been recorded successfully.",
      });
      setShowAddDialog(false);
      setExpenseForm({
        description: "",
        amount: "",
        category: "",
        paymentMethod: "cash",
        notes: "",
        expenseDate: new Date().toISOString().split("T")[0],
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add expense",
        variant: "destructive",
      });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      toast({ title: "Expense deleted successfully" });
    },
    onError: () => {
      toast({
        title: "Failed to delete expense",
        variant: "destructive",
      });
    },
  });

  const handleAddExpense = () => {
    if (!expenseForm.description.trim()) {
      toast({
        title: "Error",
        description: "Description is required",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(expenseForm.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Valid amount is required",
        variant: "destructive",
      });
      return;
    }

    createExpenseMutation.mutate(expenseForm);
  };

  const totalExpenses = expenses?.reduce((sum, expense) => {
    return sum + parseFloat(expense.amount);
  }, 0) || 0;

  const todayExpenses = expenses?.filter((expense) => {
    const expenseDate = new Date(expense.expenseDate);
    const today = new Date();
    return (
      expenseDate.getDate() === today.getDate() &&
      expenseDate.getMonth() === today.getMonth() &&
      expenseDate.getFullYear() === today.getFullYear()
    );
  }) || [];

  const todayTotal = todayExpenses.reduce((sum, expense) => {
    return sum + parseFloat(expense.amount);
  }, 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Daily Expenses</h1>
          <p className="text-sm text-muted-foreground">
            Record and track your store expenses
          </p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} data-testid="button-add-expense">
          <Plus className="h-4 w-4 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Today's Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${todayTotal.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {todayExpenses.length} expense{todayExpenses.length !== 1 ? "s" : ""} today
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses?.length || 0} total expense{expenses?.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expense History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted animate-pulse rounded" />
              ))}
            </div>
          ) : !expenses || expenses.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-10 w-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No expenses recorded yet</p>
              <p className="text-xs">Click "Add Expense" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Payment Method</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-mono text-sm">
                        {format(new Date(expense.expenseDate), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{expense.description}</p>
                          {expense.notes && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {expense.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {expense.category || (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="capitalize">
                        {expense.paymentMethod || "cash"}
                      </TableCell>
                      <TableCell className="text-right font-mono font-medium">
                        ${parseFloat(expense.amount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteExpenseMutation.mutate(expense.id)}
                          disabled={deleteExpenseMutation.isPending}
                          data-testid={`button-delete-expense-${expense.id}`}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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

      {/* Add Expense Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Expense</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Description *</label>
              <Input
                placeholder="e.g., Office supplies, Electricity bill"
                value={expenseForm.description}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, description: e.target.value })
                }
                data-testid="input-expense-description"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Amount *</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    $
                  </span>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={expenseForm.amount}
                    onChange={(e) =>
                      setExpenseForm({ ...expenseForm, amount: e.target.value })
                    }
                    className="pl-7 font-mono"
                    data-testid="input-expense-amount"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Date *</label>
                <Input
                  type="date"
                  value={expenseForm.expenseDate}
                  onChange={(e) =>
                    setExpenseForm({ ...expenseForm, expenseDate: e.target.value })
                  }
                  data-testid="input-expense-date"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={expenseForm.category}
                  onValueChange={(value) =>
                    setExpenseForm({ ...expenseForm, category: value })
                  }
                >
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Payment Method</label>
                <Select
                  value={expenseForm.paymentMethod}
                  onValueChange={(value) =>
                    setExpenseForm({ ...expenseForm, paymentMethod: value })
                  }
                >
                  <SelectTrigger data-testid="select-expense-payment">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Cash</SelectItem>
                    <SelectItem value="card">Card</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notes (optional)</label>
              <Textarea
                placeholder="Additional notes about this expense..."
                value={expenseForm.notes}
                onChange={(e) =>
                  setExpenseForm({ ...expenseForm, notes: e.target.value })
                }
                rows={3}
                data-testid="input-expense-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowAddDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={createExpenseMutation.isPending}
              data-testid="button-submit-expense"
            >
              {createExpenseMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

