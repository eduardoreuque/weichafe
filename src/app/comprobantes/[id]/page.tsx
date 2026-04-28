import Image from "next/image";
import { notFound } from "next/navigation";
import { PrintButton } from "@/components/print-button";
import { disciplineLabel, paymentMethodLabel, toDateLabel } from "@/lib/helpers";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ReceiptPage({ params }: Props) {
  const { id } = await params;

  const receipt = await prisma.receipt.findUnique({
    where: { id },
    include: {
      student: true,
      monthlyPayment: true,
      dailyClassSale: true,
    },
  });

  if (!receipt) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_10%_20%,#e8f5ff_0,#fdf4e7_45%,#f5f7ef_100%)] px-6 py-10">
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/10 bg-white p-8 shadow-xl print:border-none print:shadow-none">
        <div className="mb-8 flex items-end justify-between border-b border-black/10 pb-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-weichafe-2026.png" alt="Logo Equipo Weichafe" width={56} height={56} className="rounded-full border border-emerald-500/40 bg-slate-900 p-1" />
            <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-500">Comprobante</p>
            <h1 className="text-3xl font-semibold text-slate-900">Weichafe</h1>
            </div>
          </div>
          <div className="text-right text-sm text-slate-600">
            <p>N° {receipt.receiptNumber}</p>
            <p>Emitido: {toDateLabel(receipt.issuedAt)}</p>
          </div>
        </div>

        <div className="grid gap-3 text-sm text-slate-700 sm:grid-cols-2">
          <p>
            <span className="font-semibold">Alumno:</span> {receipt.student.fullName}
          </p>
          <p>
            <span className="font-semibold">Método pago:</span> {paymentMethodLabel(receipt.paymentMethod)}
          </p>
          <p>
            <span className="font-semibold">Detalle:</span> {receipt.description}
          </p>
          <p>
            <span className="font-semibold">Monto:</span> ${receipt.amount.toLocaleString("es-CL")}
          </p>
          {receipt.monthlyPayment ? (
            <p>
              <span className="font-semibold">Disciplina:</span> {disciplineLabel(receipt.monthlyPayment.discipline)}
            </p>
          ) : null}
          {receipt.dailyClassSale ? (
            <p>
              <span className="font-semibold">Clase:</span> {disciplineLabel(receipt.dailyClassSale.discipline)}
            </p>
          ) : null}
        </div>

        <div className="mt-8 flex gap-3 print:hidden">
          <PrintButton />
          <a className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700" href="/">
            Volver
          </a>
        </div>
      </div>
    </main>
  );
}
