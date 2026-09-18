'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight,
  Check,
  CircleDollarSign,
  Plus,
  ReceiptText,
  Sparkles,
  Trash2,
  UserRoundPlus,
  UsersRound,
  WalletCards,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Participant = {
  id: string;
  name: string;
  color: string;
};

type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  createdAt: string;
};

type Settlement = {
  from: Participant;
  to: Participant;
  amount: number;
};

const palette = ['#F36F45', '#2F766D', '#E4A93A', '#5964A6', '#A45672', '#4B84A8'];

const demoParticipants: Participant[] = [
  { id: 'ana', name: 'Ana', color: palette[0] },
  { id: 'bruno', name: 'Bruno', color: palette[1] },
  { id: 'carla', name: 'Carla', color: palette[2] },
  { id: 'diego', name: 'Diego', color: palette[3] },
];

const demoExpenses: Expense[] = [
  { id: 'hotel', description: 'Alojamiento', amount: 280, paidBy: 'ana', createdAt: 'Hoy' },
  { id: 'cena', description: 'Cena de bienvenida', amount: 96.4, paidBy: 'bruno', createdAt: 'Ayer' },
  { id: 'gasolina', description: 'Gasolina', amount: 51.4, paidBy: 'carla', createdAt: 'Ayer' },
];

const STORAGE_KEY = 'cuentas-claras-data-v2';

const money = new Intl.NumberFormat('es-BO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function initials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function Avatar({ person, small = false }: { person: Participant; small?: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-full font-bold text-white shadow-sm ${small ? 'size-8 text-[11px]' : 'size-10 text-xs'}`}
      style={{ backgroundColor: person.color }}
    >
      {initials(person.name)}
    </span>
  );
}

function calculateSettlements(participants: Participant[], expenses: Expense[]) {
  if (!participants.length) return { balances: new Map<string, number>(), settlements: [] as Settlement[] };

  const totalCents = expenses.reduce((sum, expense) => sum + Math.round(expense.amount * 100), 0);
  const baseShare = Math.floor(totalCents / participants.length);
  const remainder = totalCents % participants.length;
  const balances = new Map<string, number>();

  participants.forEach((person, index) => {
    const paid = expenses
      .filter((expense) => expense.paidBy === person.id)
      .reduce((sum, expense) => sum + Math.round(expense.amount * 100), 0);
    const share = baseShare + (index < remainder ? 1 : 0);
    balances.set(person.id, paid - share);
  });

  const creditors = participants
    .map((person) => ({ person, amount: balances.get(person.id) ?? 0 }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const debtors = participants
    .map((person) => ({ person, amount: -(balances.get(person.id) ?? 0) }))
    .filter((entry) => entry.amount > 0)
    .sort((a, b) => b.amount - a.amount);
  const settlements: Settlement[] = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const amount = Math.min(debtors[debtorIndex].amount, creditors[creditorIndex].amount);
    if (amount > 0) {
      settlements.push({
        from: debtors[debtorIndex].person,
        to: creditors[creditorIndex].person,
        amount: amount / 100,
      });
    }
    debtors[debtorIndex].amount -= amount;
    creditors[creditorIndex].amount -= amount;
    if (debtors[debtorIndex].amount === 0) debtorIndex += 1;
    if (creditors[creditorIndex].amount === 0) creditorIndex += 1;
  }

  return { balances, settlements };
}

export default function Home() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [participantOpen, setParticipantOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  const [message, setMessage] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as { participants?: Participant[]; expenses?: Expense[] };
        if (Array.isArray(parsed.participants) && Array.isArray(parsed.expenses)) {
          setParticipants(parsed.participants);
          setExpenses(parsed.expenses);
          setPaidBy(parsed.participants[0]?.id ?? '');
        }
      }
    } catch {
      // If browser storage is unavailable, the app remains fully usable in memory.
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ participants, expenses }));
  }, [participants, expenses, ready]);

  useEffect(() => {
    if (message) {
      const timeout = window.setTimeout(() => setMessage(''), 2600);
      return () => window.clearTimeout(timeout);
    }
  }, [message]);

  const total = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const hasTripData = participants.length > 0 || expenses.length > 0;
  const contributions = useMemo(
    () =>
      participants.map((person) => {
        const paid = expenses
          .filter((expense) => expense.paidBy === person.id)
          .reduce((sum, expense) => sum + expense.amount, 0);

        return {
          person,
          paid,
          percentage: total > 0 ? (paid / total) * 100 : 0,
        };
      }),
    [participants, expenses, total],
  );
  const { balances, settlements } = useMemo(
    () => calculateSettlements(participants, expenses),
    [participants, expenses],
  );

  function personFor(id: string) {
    return participants.find((person) => person.id === id);
  }

  function loadDemoData() {
    setParticipants(demoParticipants.map((person) => ({ ...person })));
    setExpenses(demoExpenses.map((expense) => ({ ...expense })));
    setPaidBy(demoParticipants[0].id);
    setMessage('Datos de prueba cargados');
  }

  function clearTrip() {
    setParticipants([]);
    setExpenses([]);
    setPaidBy('');
    setClearOpen(false);
    setMessage('Datos eliminados');
  }

  function addParticipant(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'persona'}-${Date.now()}`;
    const person = { id, name, color: palette[participants.length % palette.length] };
    setParticipants((current) => [...current, person]);
    if (!paidBy) setPaidBy(id);
    setNewName('');
    setParticipantOpen(false);
    setMessage(`${name} se unió al viaje`);
  }

  function removeParticipant(person: Participant) {
    const hasExpenses = expenses.some((expense) => expense.paidBy === person.id);
    if (hasExpenses) {
      setMessage(`No puedes quitar a ${person.name}: tiene gastos registrados`);
      return;
    }
    setParticipants((current) => current.filter((item) => item.id !== person.id));
    if (paidBy === person.id) setPaidBy(participants.find((item) => item.id !== person.id)?.id ?? '');
    setMessage(`${person.name} fue eliminado del viaje`);
  }

  function addExpense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsedAmount = Number.parseFloat(amount.replace(',', '.'));
    if (!description.trim() || !paidBy || !Number.isFinite(parsedAmount) || parsedAmount <= 0) return;
    setExpenses((current) => [
      {
        id: `expense-${Date.now()}`,
        description: description.trim(),
        amount: Math.round(parsedAmount * 100) / 100,
        paidBy,
        createdAt: 'Ahora',
      },
      ...current,
    ]);
    setDescription('');
    setAmount('');
    setExpenseOpen(false);
    setMessage('Gasto agregado correctamente');
  }

  function deleteExpense(id: string) {
    setExpenses((current) => current.filter((expense) => expense.id !== id));
    setMessage('Gasto eliminado');
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1240px] px-4 pb-16 pt-5 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between gap-4 py-2">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-[0_8px_20px_rgba(25,67,59,0.18)]">
              <WalletCards className="size-5" strokeWidth={2.25} />
            </span>
            <div>
              <p className="font-heading text-lg font-extrabold leading-tight tracking-[-0.03em]">Cuentas Claras</p>
              <p className="text-xs text-muted-foreground">Viaje entre amigos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasTripData && (
              <Button
                variant="ghost"
                size="lg"
                className="h-10 rounded-xl px-3 text-muted-foreground hover:bg-white hover:text-foreground"
                onClick={() => setClearOpen(true)}
                aria-label="Limpiar todos los datos"
              >
                <Trash2 data-icon="inline-start" />
                <span className="hidden sm:inline">Limpiar datos</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="lg"
              className="h-10 rounded-xl bg-white px-3.5 shadow-sm"
              onClick={() => setParticipantOpen(true)}
            >
              <UserRoundPlus data-icon="inline-start" />
              <span className="hidden sm:inline">Agregar persona</span>
              <span className="sm:hidden">Persona</span>
            </Button>
          </div>
        </header>

        <section className="trip-hero mt-7 overflow-hidden rounded-[28px] px-6 py-7 text-white shadow-[0_24px_60px_rgba(28,68,62,0.16)] sm:px-9 sm:py-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_auto] lg:items-end">
            <div className="max-w-2xl">
              <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-white/65">
                <CircleDollarSign className="size-4" /> Resumen del viaje
              </p>
              {hasTripData ? (
                <>
                  <p className="text-sm text-white/70">Gasto total entre todos</p>
                  <h1 className="mt-1 font-heading text-4xl font-black tracking-[-0.055em] sm:text-5xl">
                    {money.format(total)}
                  </h1>
                  {total > 0 && (
                    <div className="mt-6 max-w-xl">
                      <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold text-white/65">
                        <span>Aportes del grupo</span>
                        <span>{participants.length} participantes</span>
                      </div>
                      <div
                        className="flex h-3 overflow-hidden rounded-full bg-black/15 ring-1 ring-white/10"
                        role="img"
                        aria-label="Distribución de aportes por participante"
                      >
                        {contributions
                          .filter((entry) => entry.paid > 0)
                          .map((entry) => (
                            <span
                              key={entry.person.id}
                              className="h-full border-r border-white/25 last:border-r-0"
                              style={{
                                width: `${entry.percentage}%`,
                                backgroundColor: entry.person.color,
                              }}
                            />
                          ))}
                      </div>
                      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                        {contributions.map((entry) => (
                          <div key={entry.person.id} className="flex items-center gap-1.5 text-xs text-white/75">
                            <span
                              className="size-2 rounded-full ring-2 ring-white/10"
                              style={{ backgroundColor: entry.person.color }}
                            />
                            <span>{entry.person.name}</span>
                            <strong className="text-white">{Math.round(entry.percentage)}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h1 className="font-heading text-3xl font-black tracking-[-0.05em] sm:text-4xl">
                    Tu viaje empieza aquí
                  </h1>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/70">
                    Agrega a tus amigos y registra los gastos desde cero, o carga un ejemplo para probar cómo funciona.
                  </p>
                  <div className="mt-5 flex flex-col gap-2.5 sm:flex-row">
                    <Button
                      size="lg"
                      className="h-11 rounded-xl bg-white px-4 text-primary hover:bg-white/90"
                      onClick={() => setParticipantOpen(true)}
                    >
                      <UserRoundPlus data-icon="inline-start" /> Agregar primera persona
                    </Button>
                    <Button
                      variant="outline"
                      size="lg"
                      className="h-11 rounded-xl border-white/25 bg-white/10 px-4 text-white hover:bg-white/20 hover:text-white"
                      onClick={loadDemoData}
                    >
                      <Sparkles data-icon="inline-start" /> Cargar datos de prueba
                    </Button>
                  </div>
                </>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:flex">
              <div className="min-w-[135px] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/60">Por persona</p>
                <p className="mt-1 text-lg font-bold">{money.format(participants.length ? total / participants.length : 0)}</p>
              </div>
              <div className="min-w-[135px] rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs text-white/60">Gastos</p>
                <p className="mt-1 text-lg font-bold">{expenses.length} registrados</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.45fr)_minmax(340px,0.85fr)]">
          <div className="space-y-6">
            <section className="surface-card p-5 sm:p-6">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="section-kicker"><UsersRound className="size-4" /> El grupo</p>
                  <h2 className="section-title">Participantes</h2>
                </div>
                <span className="count-pill">{participants.length} personas</span>
              </div>

              {participants.length ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {participants.map((person) => {
                    const balance = (balances.get(person.id) ?? 0) / 100;
                    return (
                      <div key={person.id} className="group flex items-center gap-3 rounded-2xl border border-border/70 bg-white p-3 transition hover:border-primary/25 hover:shadow-sm">
                        <Avatar person={person} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{person.name}</p>
                          <p className={`text-xs font-medium ${balance > 0 ? 'text-positive' : balance < 0 ? 'text-coral' : 'text-muted-foreground'}`}>
                            {balance > 0 ? `Recibe ${money.format(balance)}` : balance < 0 ? `Debe ${money.format(Math.abs(balance))}` : 'Está a mano'}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar a ${person.name}`}
                          className="opacity-50 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => removeParticipant(person)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={UsersRound} title="Todavía no hay participantes" text="Agrega a tus amigos manualmente o carga los datos de prueba desde el resumen." />
              )}
            </section>

            <section className="surface-card overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-5 py-5 sm:px-6">
                <div>
                  <p className="section-kicker"><ReceiptText className="size-4" /> Lo que gastaron</p>
                  <h2 className="section-title">Gastos</h2>
                </div>
                <Button
                  size="lg"
                  className="h-10 rounded-xl px-3.5 shadow-sm"
                  disabled={!participants.length}
                  onClick={() => {
                    setPaidBy(participants[0]?.id ?? '');
                    setExpenseOpen(true);
                  }}
                >
                  <Plus data-icon="inline-start" /> Agregar gasto
                </Button>
              </div>

              {expenses.length ? (
                <div className="divide-y divide-border/70 border-t border-border/70">
                  {expenses.map((expense) => {
                    const payer = personFor(expense.paidBy);
                    if (!payer) return null;
                    return (
                      <div key={expense.id} className="group flex items-center gap-3 px-5 py-4 transition hover:bg-muted/45 sm:px-6">
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sand text-ink-soft">
                          <ReceiptText className="size-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">{expense.description}</p>
                          <div className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Avatar person={payer} small />
                            <span>Pagó {payer.name}</span><span aria-hidden="true">·</span><span>{expense.createdAt}</span>
                          </div>
                        </div>
                        <p className="whitespace-nowrap text-sm font-black sm:text-base">{money.format(expense.amount)}</p>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Eliminar ${expense.description}`}
                          className="text-muted-foreground opacity-60 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus-visible:opacity-100"
                          onClick={() => deleteExpense(expense.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="border-t border-border/70 p-6">
                  <EmptyState icon={ReceiptText} title="Sin gastos todavía" text="Registra el primer pago del viaje para calcular las cuentas." />
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="surface-card p-5 sm:p-6">
              <p className="section-kicker"><CircleDollarSign className="size-4" /> Balance individual</p>
              <h2 className="section-title">Quién debe y quién recibe</h2>
              {participants.length ? (
                <div className="mt-5 space-y-3">
                  {participants.map((person) => {
                    const balance = (balances.get(person.id) ?? 0) / 100;
                    const positive = balance > 0;
                    return (
                      <div key={person.id} className="flex items-center gap-3">
                        <Avatar person={person} small />
                        <p className="min-w-0 flex-1 truncate text-sm font-semibold">{person.name}</p>
                        <div className="text-right">
                          <p className={`text-sm font-black ${positive ? 'text-positive' : balance < 0 ? 'text-coral' : 'text-muted-foreground'}`}>
                            {positive ? '+' : balance < 0 ? '−' : ''}{money.format(Math.abs(balance))}
                          </p>
                          <p className="text-[11px] text-muted-foreground">{positive ? 'recibe' : balance < 0 ? 'debe' : 'a mano'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-5">
                  <EmptyState icon={CircleDollarSign} title="Sin balances por calcular" text="Los saldos aparecerán cuando agregues participantes y gastos." />
                </div>
              )}
            </section>

            <section className="settlement-card p-5 sm:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="section-kicker text-primary/70"><Check className="size-4" /> Plan más simple</p>
                  <h2 className="section-title">Cómo quedar a mano</h2>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-4" strokeWidth={3} />
                </span>
              </div>

              {!participants.length || !expenses.length ? (
                <div className="mt-5 rounded-2xl border border-primary/10 bg-white/75 p-5 text-center">
                  <ReceiptText className="mx-auto mb-2 size-5 text-primary" />
                  <p className="text-sm font-bold">Aún no hay cuentas por saldar</p>
                  <p className="mt-1 text-xs text-muted-foreground">Completa el viaje para obtener un plan de pagos.</p>
                </div>
              ) : settlements.length ? (
                <div className="mt-5 space-y-3">
                  {settlements.map((settlement, index) => (
                    <div key={`${settlement.from.id}-${settlement.to.id}-${index}`} className="rounded-2xl border border-primary/10 bg-white/75 p-3.5">
                      <div className="flex items-center gap-2">
                        <Avatar person={settlement.from} small />
                        <ArrowRight className="size-4 shrink-0 text-primary/40" />
                        <Avatar person={settlement.to} small />
                        <p className="ml-auto text-sm font-black text-primary">{money.format(settlement.amount)}</p>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <strong className="text-foreground">{settlement.from.name}</strong> paga a <strong className="text-foreground">{settlement.to.name}</strong>
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-primary/10 bg-white/75 p-5 text-center">
                  <Check className="mx-auto mb-2 size-5 text-primary" />
                  <p className="text-sm font-bold">¡Todo está saldado!</p>
                  <p className="mt-1 text-xs text-muted-foreground">No hay pagos pendientes entre el grupo.</p>
                </div>
              )}
              <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
                Dividimos el total en partes iguales y reducimos la cantidad de transferencias necesarias.
              </p>
            </section>
          </aside>
        </div>

        <footer className="mt-8 text-center text-xs text-muted-foreground">
          Los cambios se guardan automáticamente en este dispositivo.
        </footer>
      </div>

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <span className="mb-2 grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <Trash2 className="size-5" />
            </span>
            <DialogTitle className="text-xl font-extrabold tracking-tight">¿Limpiar todos los datos?</DialogTitle>
            <DialogDescription>
              Se eliminarán los participantes y gastos actuales. La aplicación quedará vacía para comenzar un viaje nuevo.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="-mx-6 -mb-6 mt-3 px-6 py-4">
            <Button type="button" variant="outline" size="lg" onClick={() => setClearOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" size="lg" onClick={clearTrip}>
              Sí, limpiar datos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={participantOpen} onOpenChange={setParticipantOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <span className="mb-2 grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <UserRoundPlus className="size-5" />
            </span>
            <DialogTitle className="text-xl font-extrabold tracking-tight">Agregar participante</DialogTitle>
            <DialogDescription>Incluye a otra persona en la división de todos los gastos del viaje.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addParticipant}>
            <div className="space-y-2 py-4">
              <Label htmlFor="participant-name">Nombre</Label>
              <Input
                id="participant-name"
                autoFocus
                value={newName}
                onChange={(event) => setNewName(event.target.value)}
                placeholder="Ej. Valentina"
                className="h-11 rounded-xl bg-white"
                maxLength={40}
              />
            </div>
            <DialogFooter className="-mx-6 -mb-6 px-6 py-4">
              <Button type="button" variant="outline" size="lg" onClick={() => setParticipantOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" disabled={!newName.trim()}>Agregar al viaje</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
        <DialogContent className="rounded-3xl p-6 sm:max-w-md">
          <DialogHeader>
            <span className="mb-2 grid size-11 place-items-center rounded-2xl bg-secondary text-primary">
              <ReceiptText className="size-5" />
            </span>
            <DialogTitle className="text-xl font-extrabold tracking-tight">Registrar un gasto</DialogTitle>
            <DialogDescription>Anota qué se pagó, cuánto costó y quién puso el dinero.</DialogDescription>
          </DialogHeader>
          <form onSubmit={addExpense}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="expense-description">Descripción</Label>
                <Input
                  id="expense-description"
                  autoFocus
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Ej. Almuerzo en la playa"
                  className="h-11 rounded-xl bg-white"
                  maxLength={60}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expense-amount">Monto</Label>
                  <Input
                    id="expense-amount"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="0,00"
                    className="h-11 rounded-xl bg-white"
                    aria-describedby="currency-hint"
                  />
                  <span id="currency-hint" className="sr-only">Monto en dólares</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense-payer">Pagó</Label>
                  <Select value={paidBy} onValueChange={(value) => setPaidBy(value ?? '')}>
                    <SelectTrigger id="expense-payer" className="h-11 w-full rounded-xl bg-white">
                      <SelectValue placeholder="Elige" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      {participants.map((person) => (
                        <SelectItem key={person.id} value={person.id}>{person.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter className="-mx-6 -mb-6 px-6 py-4">
              <Button type="button" variant="outline" size="lg" onClick={() => setExpenseOpen(false)}>Cancelar</Button>
              <Button type="submit" size="lg" disabled={!description.trim() || !amount || !paidBy}>Guardar gasto</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-5 left-1/2 z-[70] flex -translate-x-1/2 items-center gap-2 rounded-full bg-foreground px-4 py-2.5 text-sm font-semibold text-background shadow-xl transition-all ${message ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'}`}
      >
        <Check className="size-4" /> {message}
      </div>
    </main>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof UsersRound;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border p-7 text-center">
      <Icon className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-bold">{title}</p>
      <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}
