"use client";
import { useRouter } from "next/navigation";

/**
 * Temporary mock data.
 * Replace this later with API / Supabase data.
 */
const mockEstate = {
	id: "estate_1",
	name: "Pineview Estate",
};

const mockInvoices = [
	{
		id: "inv_001",
		reference: "ED-INV-2024-0001",
		title: "Annual Service Charge",
		description: "Yearly maintenance & facilities",
		amount: 50000,
		status: "pending",
		billingPeriod: "Jan 2024 – Dec 2024",
		tag: "Management",
	},
	{
		id: "inv_002",
		reference: "ED-INV-2024-0002",
		title: "Monthly Estate Dues",
		description: "June maintenance fee",
		amount: 10000,
		status: "pending",
		billingPeriod: "June 2024",
		tag: "Management",
	},
];

const mockHistory = [
	{
		id: "pay_1",
		invoiceId: "inv_010",
		invoiceRef: "ED-INV-2024-0003",
		title: "Estate Dues",
		period: "May 2024",
		amount: 10000,
		date: "May 02, 2024",
		status: "Successful",
	},
	{
		id: "pay_2",
		invoiceId: "inv_009",
		invoiceRef: "ED-INV-2024-0004",
		title: "Estate Dues",
		period: "April 2024",
		amount: 10000,
		date: "Apr 01, 2024",
		status: "Successful",
	},
	{
		id: "pay_3",
		invoiceId: "inv_008",
		invoiceRef: "ED-INV-2024-0005",
		title: "Security Fee",
		period: "Q1 2024",
		amount: 15000,
		date: "Mar 15, 2024",
		status: "Successful",
	},
	{
		id: "pay_4",
		invoiceId: "inv_007",
		invoiceRef: "ED-INV-2024-0006",
		title: "Estate Dues",
		period: "March 2024",
		amount: 10000,
		date: "Mar 01, 2024",
		status: "Successful",
	},
];

const pills = [
	{ label: "All", route: "/resident" },
	{ label: "Electricity", route: "/resident/electricity" },
	{ label: "Estate Dues", route: "/resident/estate_dues" },
	{ label: "Others", route: "/resident/others" },
];

export default function EstateDuesPage() {
	const router = useRouter();

	function handlePayInvoice(invoiceId: string) {
		// Later this will start Paystack initialization
		// and pass invoiceId to your backend.
		console.log("Pay invoice:", invoiceId);
	}

	function handleDownloadReceipt(paymentId: string) {
		console.log("Download receipt for:", paymentId);
	}

	return (
		<div className="min-h-screen bg-utili-bg text-utili-navy antialiased">
			{/* Navbar */}
			<nav className="sticky top-0 z-50 bg-white border-b border-slate-200 nav-shadow">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex justify-between items-center h-20">
						{/* Logo */}
						<div className="flex items-center h-16" style={{ height: '64px' }}>
							<img src="/images/utilipay_logo.png"
								alt="UtiliPay Logo"
								className="w-32 h-32 object-contain" />
						</div>

						<div className="flex items-center gap-6">
							<div className="hidden md:flex flex-col items-end mr-2">
								<span className="text-sm font-bold text-utili-navy">
									Ayinachiso Nweze
								</span>
								<span className="text-xs text-utili-muted">
									House 12, Block B, Pineview Estate
								</span>
							</div>

							<button className="relative p-2 text-slate-400 hover:text-utili-primary transition-colors">
								<span className="material-symbols-outlined text-[28px]">
									notifications
								</span>
								<span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 border-2 border-white rounded-full"></span>
							</button>

							<div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden">
								<span className="material-symbols-outlined text-slate-400">
									person
								</span>
							</div>
						</div>
					</div>
				</div>
			</nav>

			{/* Main */}
			<main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

				<div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6">
					<div>
						<h1 className="text-2xl font-bold text-utili-navy">
							Good morning, Ayinachiso Nweze
						</h1>
						<p className="text-utili-muted mt-1">
							Manage and pay your property-related management fees.
						</p>
					</div>

					<div className="flex flex-wrap gap-2">
						{pills.map((pill) => (
							<button
								key={pill.label}
								className={`px-5 py-2 rounded-full text-xs font-bold transition-all ${
									pill.label === "Estate Dues"
										? "pill-active"
										: "pill-inactive"
								}`}
								onClick={() => router.push(pill.route)}
								type="button"
							>
								{pill.label}
							</button>
						))}
					</div>
				</div>

				{/* Summary cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
					<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm card-hover">
						<p className="text-sm font-medium text-utili-muted mb-2">
							Total Outstanding Dues
						</p>
						<div className="flex items-end gap-2">
							<h2 className="text-3xl font-extrabold text-utili-navy">
								₦60,000
							</h2>
							<span className="text-xs font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full mb-1">
								Due soon
							</span>
						</div>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm card-hover">
						<p className="text-sm font-medium text-utili-muted mb-2">
							Paid Dues (Current Year)
						</p>
						<h2 className="text-3xl font-extrabold text-utili-navy">
							₦120,000
						</h2>
					</div>

					<div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm card-hover">
						<p className="text-sm font-medium text-utili-muted mb-2">
							Pending Invoices
						</p>
						<h2 className="text-3xl font-extrabold text-utili-navy">
							{mockInvoices.length}
						</h2>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

					{/* Active invoices */}
					<div className="lg:col-span-1 space-y-6">
						<div className="flex items-center justify-between mb-2">
							<h3 className="text-lg font-bold text-utili-navy">
								Active Bills
							</h3>
						</div>

						{mockInvoices.map((invoice) => (
							<div
								key={invoice.id}
								className="bg-white border border-slate-100 p-5 rounded-2xl shadow-sm flex flex-col gap-4"
							>
								<div className="flex justify-between items-start">
									<div>
										<div className="flex items-center gap-2 mb-1">
											<p className="font-bold text-utili-navy">
												{invoice.title}
											</p>
											<span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold uppercase rounded border border-green-100">
												{invoice.tag}
											</span>
										</div>

										<p className="text-sm text-utili-muted">
											{invoice.description}
										</p>

										<p className="text-xs text-utili-muted mt-1">
											Billing period: {invoice.billingPeriod}
										</p>

										<p className="text-xs text-utili-muted mt-1">
											Invoice ref: {invoice.reference}
										</p>
									</div>

									<span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-amber-100">
										{invoice.status}
									</span>
								</div>

								<div className="flex items-center justify-between">
									<span className="text-xl font-bold text-utili-navy">
										₦{invoice.amount.toLocaleString()}
									</span>

									<button
										onClick={() => handlePayInvoice(invoice.id)}
										className="px-4 py-2 bg-utili-primary hover:bg-utili-blue text-white text-sm font-bold rounded-xl transition-all shadow-md shadow-blue-500/20 active:scale-95"
									>
										Pay Now
									</button>
								</div>
							</div>
						))}

						<div className="pt-6 border-t border-slate-200">
							<p className="text-xs font-bold text-utili-muted uppercase tracking-widest mb-4">
								Secure Payment Channels
							</p>

							<div className="flex flex-wrap gap-4 opacity-60">
								<div className="flex items-center gap-1.5">
									<span className="material-symbols-outlined text-xl">
										credit_card
									</span>
									<span className="text-xs font-medium">Card</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="material-symbols-outlined text-xl">
										account_balance
									</span>
									<span className="text-xs font-medium">Bank</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="material-symbols-outlined text-xl">
										dialpad
									</span>
									<span className="text-xs font-medium">USSD</span>
								</div>
								<div className="flex items-center gap-1.5">
									<span className="material-symbols-outlined text-xl">
										chat
									</span>
									<span className="text-xs font-medium">WhatsApp</span>
								</div>
							</div>
						</div>
					</div>

					{/* History */}
					<div className="lg:col-span-2">
						<div className="flex items-center justify-between mb-4">
							<h3 className="text-lg font-bold text-utili-navy">
								Estate Dues History
							</h3>

							<button className="flex items-center gap-2 text-sm font-medium text-utili-muted border border-slate-200 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50">
								<span className="material-symbols-outlined text-lg">
									filter_list
								</span>
								Filter
							</button>
						</div>

						<div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
							<div className="overflow-x-auto">
								<table className="w-full text-left">
									<thead className="bg-slate-50 border-b border-slate-100">
										<tr>
											<th className="px-6 py-4 text-xs font-bold text-utili-muted uppercase tracking-wider">
												Invoice
											</th>
											<th className="px-6 py-4 text-xs font-bold text-utili-muted uppercase tracking-wider">
												Amount (₦)
											</th>
											<th className="px-6 py-4 text-xs font-bold text-utili-muted uppercase tracking-wider">
												Date
											</th>
											<th className="px-6 py-4 text-xs font-bold text-utili-muted uppercase tracking-wider">
												Status
											</th>
											<th className="px-6 py-4 text-xs font-bold text-utili-muted uppercase tracking-wider">
												Receipt
											</th>
										</tr>
									</thead>

									<tbody className="divide-y divide-slate-100">
										{mockHistory.map((item) => (
											<tr
												key={item.id}
												className="hover:bg-slate-50 transition-colors"
											>
												<td className="px-6 py-4">
													<div className="flex flex-col gap-1">
														<span className="text-sm font-medium text-utili-navy">
															{item.title} – {item.period}
														</span>
														<span className="text-xs text-utili-muted">
															Invoice ref: {item.invoiceRef}
														</span>
													</div>
												</td>

												<td className="px-6 py-4 text-sm font-bold">
													{item.amount.toLocaleString()}
												</td>

												<td className="px-6 py-4 text-sm text-utili-muted">
													{item.date}
												</td>

												<td className="px-6 py-4">
													<span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-bold uppercase tracking-wider rounded-md border border-green-100">
														{item.status}
													</span>
												</td>

												<td className="px-6 py-4">
													<button
														onClick={() =>
															handleDownloadReceipt(item.id)
														}
														className="text-utili-primary text-xs font-bold flex items-center gap-1 hover:underline"
													>
														<span className="material-symbols-outlined text-sm">
															download
														</span>
														Download
													</button>
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>
						</div>
					</div>
				</div>
			</main>

			{/* Footer */}
			<footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 mb-8 py-6 border-t border-slate-200">
				<div className="flex flex-col md:flex-row justify-between items-center gap-4">
					<div className="flex items-center gap-2 opacity-60">
						<span className="material-symbols-outlined text-sm text-utili-success">
							verified
						</span>
						<p className="text-xs text-utili-muted">
							Payments are verified by licensed partners. All records are
							auditable.
						</p>
					</div>

					<p className="text-xs text-utili-muted">
						© 2024 UtiliPay Inc. Secured by 256-bit encryption.
					</p>
				</div>
			</footer>

			<style jsx global>{`
				:root {
					--utili-navy: #0b1120;
					--utili-blue: #1e40af;
					--utili-primary: #2563eb;
					--utili-success: #10b981;
					--utili-muted: #64748b;
					--utili-bg: #f8fafc;
				}
				.bg-utili-bg {
					background-color: var(--utili-bg);
				}
				.text-utili-navy {
					color: var(--utili-navy);
				}
				.text-utili-muted {
					color: var(--utili-muted);
				}
				.text-utili-primary {
					color: var(--utili-primary);
				}
				.text-utili-success {
					color: var(--utili-success);
				}
				.nav-shadow {
					box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.05),
						0 1px 2px -1px rgb(0 0 0 / 0.05);
				}
				.card-hover {
					transition: all 0.2s;
				}
				.card-hover:hover {
					box-shadow: 0 4px 24px 0 rgb(37 99 235 / 0.08);
					border-color: #2563eb33;
				}
				.pill-active {
					background: var(--utili-primary);
					color: #fff;
					box-shadow: 0 2px 8px 0 #3b82f633;
				}
				.pill-inactive {
					background: #fff;
					color: var(--utili-muted);
					border: 1px solid #e2e8f0;
				}
				.pill-inactive:hover {
					border-color: var(--utili-primary);
					color: var(--utili-primary);
				}
			`}</style>

			<link
				href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
				rel="stylesheet"
			/>
			<link
				href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
				rel="stylesheet"
			/>
		</div>
	);
}