<?php

declare(strict_types=1);

namespace App\Actions;

use App\DTOs\CreateInvoiceData;
use App\Models\Invoice;
use App\Models\InvoiceLineItem;
use App\Notifications\InvoiceCreatedNotification;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

final class CreateInvoiceAction
{
    public function __construct(
        private readonly TaxCalculator $taxCalculator,
        private readonly InvoiceNumberGenerator $numberGenerator,
    ) {}

    public function execute(CreateInvoiceData $data): Invoice
    {
        $this->validate($data);

        return DB::transaction(function () use ($data): Invoice {
            $invoice = Invoice::create([
                'number' => $this->numberGenerator->next(),
                'customer_id' => $data->customerId,
                'due_date' => $data->dueDate,
                'currency' => $data->currency,
                'status' => 'draft',
            ]);

            $subtotalCents = 0;

            foreach ($data->lineItems as $item) {
                $lineTotalCents = $item->unitPriceCents * $item->quantity;
                $subtotalCents += $lineTotalCents;

                InvoiceLineItem::create([
                    'invoice_id' => $invoice->id,
                    'description' => $item->description,
                    'quantity' => $item->quantity,
                    'unit_price_cents' => $item->unitPriceCents,
                    'total_cents' => $lineTotalCents,
                ]);
            }

            $taxCents = $this->taxCalculator->calculate($subtotalCents, $data->taxRegion);

            $invoice->update([
                'subtotal_cents' => $subtotalCents,
                'tax_cents' => $taxCents,
                'total_cents' => $subtotalCents + $taxCents,
            ]);

            $invoice->customer->notify(new InvoiceCreatedNotification($invoice));

            return $invoice->fresh(['lineItems', 'customer']);
        });
    }

    private function validate(CreateInvoiceData $data): void
    {
        if ($data->lineItems === []) {
            throw ValidationException::withMessages([
                'line_items' => ['At least one line item is required.'],
            ]);
        }

        if ($data->dueDate->isPast()) {
            throw ValidationException::withMessages([
                'due_date' => ['Due date must be in the future.'],
            ]);
        }
    }
}
