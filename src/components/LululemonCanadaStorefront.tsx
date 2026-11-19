import { useMemo, useRef, useState } from 'react';
import {
  ArrowRight,
  Droplets,
  Leaf,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
  Zap,
} from 'lucide-react';
import type { ChatTurnRecord, StorefrontPage } from '../types.ts';
import { SustainabilityEsgPage } from './SustainabilityEsgPage.tsx';

interface SwatchOption {
  name: string;
  hex: string;
}

interface CatalogProduct {
  id: string;
  name: string;
  category: 'Women' | 'Men' | 'Accessories' | 'Shoes';
  tag?: string;
  subtitle: string;
  priceCad: number;
  image: string;
  swatches: SwatchOption[];
}

const LULULEMON_PRODUCTS: CatalogProduct[] = [
  {
    id: 'scuba-half-zip',
    name: 'Scuba Oversized Half-Zip Hoodie',
    category: 'Women',
    tag: 'New Winter Arrival',
    subtitle: 'Plush cotton-blend fleece · Oversized fit',
    priceCad: 118,
    image: '/src/assets/images/lulu_scuba_hoodie_1795051147660.jpg',
    swatches: [
      { name: 'Heathered Bone', hex: '#D6D1C7' },
      { name: 'Black', hex: '#1D1D1D' },
      { name: 'Espresso', hex: '#4B3629' },
    ],
  },
  {
    id: 'align-25',
    name: 'Align™ High-Rise Pant 25"',
    category: 'Women',
    tag: 'Bestseller',
    subtitle: 'Buttery-soft Nulu™ fabric · Weightless feel',
    priceCad: 98,
    image: '/src/assets/images/lulu_align_pant_1794960652238.jpg',
    swatches: [
      { name: 'Black', hex: '#1D1D1D' },
      { name: 'True Navy', hex: '#222F3E' },
      { name: 'Garnet', hex: '#6E222A' },
    ],
  },
  {
    id: 'belt-bag-1l',
    name: 'Everywhere Belt Bag 1L',
    category: 'Accessories',
    tag: 'Winter Edit',
    subtitle: 'Water-repellent fabric · Exterior zip pocket',
    priceCad: 38,
    image: '/src/assets/images/lulu_belt_bag_1795051148368.jpg',
    swatches: [
      { name: 'Black', hex: '#1D1D1D' },
      { name: 'Trench', hex: '#C7B8A1' },
      { name: 'Dark Forest', hex: '#2D4032' },
    ],
  },
  {
    id: 'define-jacket',
    name: 'Define Jacket Nulu™',
    category: 'Women',
    tag: 'New Winter Arrival',
    subtitle: 'Contoured fit · Thumbholes & Cuffins™',
    priceCad: 128,
    image: '/src/assets/images/lulu_define_jacket_1794960652572.jpg',
    swatches: [
      { name: 'Nightfall', hex: '#2F3647' },
      { name: 'Black', hex: '#1D1D1D' },
      { name: 'Bone', hex: '#ECEAE4' },
    ],
  },
  {
    id: 'pace-breaker',
    name: 'Pace Breaker Linerless Short 5"',
    category: 'Men',
    subtitle: 'Lightweight Swift™ fabric · Train & run',
    priceCad: 68,
    image: '/src/assets/images/lulu_pace_short_1794960653343.jpg',
    swatches: [
      { name: 'True Navy', hex: '#222F3E' },
      { name: 'Black', hex: '#1D1D1D' },
      { name: 'Solar Grey', hex: '#8E9299' },
    ],
  },
  {
    id: 'winter-run-tight',
    name: 'Cold-Weather Technical Layer Kit',
    category: 'Men',
    tag: 'Cold-Weather Ready',
    subtitle: 'Brushed warmth · Sweat-wicking stretch',
    priceCad: 138,
    image: '/src/assets/images/lulu_hero_runner_1794960652296.jpg',
    swatches: [
      { name: 'Obsidian', hex: '#252629' },
      { name: 'Black', hex: '#1D1D1D' },
    ],
  },
];

interface BagEntry {
  product: CatalogProduct;
  selectedColor: string;
  qty: number;
}

interface LululemonCanadaStorefrontProps {
  activePage: StorefrontPage;
  onChangePage: (page: StorefrontPage) => void;
  turns: ChatTurnRecord[];
  onOpenChat: () => void;
  compact?: boolean;
}

export function LululemonCanadaStorefront({
  activePage,
  onChangePage,
  turns,
  onOpenChat,
  compact = false,
}: LululemonCanadaStorefrontProps) {
  const [selectedNav, setSelectedNav] = useState<'All' | 'Women' | 'Men' | 'Accessories' | 'Shoes'>(
    'All'
  );
  const [selectedColors, setSelectedColors] = useState<Record<string, string>>({});
  const [bag, setBag] = useState<BagEntry[]>([]);
  const [bagOpen, setBagOpen] = useState(false);
  const catalogRef = useRef<HTMLElement | null>(null);

  const totalBagItems = bag.reduce((s, e) => s + e.qty, 0);
  const bagSubtotal = bag.reduce((s, e) => s + e.product.priceCad * e.qty, 0);

  const visibleProducts = useMemo(() => {
    if (selectedNav === 'All' || selectedNav === 'Shoes') {
      return LULULEMON_PRODUCTS;
    }
    return LULULEMON_PRODUCTS.filter((p) => p.category === selectedNav);
  }, [selectedNav]);

  const sessionSavedTokens = turns.reduce((s, t) => s + t.metrics.savedTokens, 0);
  const sessionSavedWh = turns.reduce((s, t) => s + t.metrics.savedElectricityWh, 0);
  const sessionSavedWaterMl = turns.reduce((s, t) => s + t.metrics.savedWaterMl, 0);
  const esgBarPercent = Math.min(100, Math.max(8, Math.round((sessionSavedTokens / 10500) * 100)));

  const scrollToCatalog = (category?: 'All' | 'Women' | 'Men' | 'Accessories') => {
    if (category) setSelectedNav(category);
    onChangePage('home');
    window.setTimeout(() => {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 40);
  };

  const addToBag = (product: CatalogProduct) => {
    const color = selectedColors[product.id] ?? product.swatches[0].name;
    setBag((prev) => {
      const existing = prev.find(
        (i) => i.product.id === product.id && i.selectedColor === color
      );
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id && i.selectedColor === color
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { product, selectedColor: color, qty: 1 }];
    });
  };

  const updateBagQty = (id: string, color: string, delta: number) => {
    setBag((prev) =>
      prev
        .map((i) =>
          i.product.id === id && i.selectedColor === color ? { ...i, qty: i.qty + delta } : i
        )
        .filter((i) => i.qty > 0)
    );
  };

  return (
    <div className="flex flex-col bg-white text-[#1D1D1D]">
      {/* Slim Retail Announcement Strip (<= 36px) */}
      <div className="bg-[#1D1D1D] px-4 py-1.5 text-center text-[11px] font-medium tracking-wide text-white">
        Free shipping &amp; free returns across Canada ·{' '}
        <button
          type="button"
          onClick={() => scrollToCatalog('All')}
          className="font-semibold underline underline-offset-2 hover:text-neutral-200"
        >
          Shop New Winter Arrivals
        </button>
      </div>

      {/* Lululemon Canada Storefront Navbar */}
      <header className="relative border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-3.5 sm:px-8">
          {/* Lululemon Logo + Canada */}
          <button
            type="button"
            onClick={() => {
              setSelectedNav('All');
              onChangePage('home');
            }}
            className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1D1D1D] rounded"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 shrink-0 text-[#D31334]"
              fill="currentColor"
              aria-hidden="true"
            >
              <circle cx="12" cy="12" r="11" />
              <path
                d="M12 5.5c-2.6 0-4.4 1.8-4.4 4.3 0 2.1 1.4 3.6 1.4 5.8 0 1.2-.6 2.1-1.6 2.7l1.2 1.2c1.4-.9 2.2-2.2 2.2-3.9 0-2-.9-3.6-.9-5.4 0-1.6.9-2.7 2.1-2.7s2.1 1.1 2.1 2.7c0 1.8-.9 3.4-.9 5.4 0 1.7.8 3 2.2 3.9l1.2-1.2c-1-.6-1.6-1.5-1.6-2.7 0-2.2 1.4-3.7 1.4-5.8 0-2.5-1.8-4.3-4.4-4.3z"
                fill="#FFFFFF"
              />
            </svg>
            <span className="font-[var(--font-display)] text-base font-bold tracking-tight text-[#1D1D1D] lowercase whitespace-nowrap">
              lululemon
            </span>
            <span className="hidden sm:inline text-[11px] font-medium uppercase tracking-wider text-neutral-400">
              Canada
            </span>
          </button>

          {/* Navigation Links */}
          <nav
            aria-label="Lululemon store categories"
            className={`items-center gap-5 ${compact ? 'hidden xl:flex' : 'hidden md:flex'}`}
          >
            {(['Women', 'Men', 'Accessories', 'Shoes'] as const).map((cat) => {
              const active = activePage === 'home' && selectedNav === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setSelectedNav(cat);
                    onChangePage('home');
                  }}
                  className={`text-xs font-semibold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'text-[#D31334] underline underline-offset-4 decoration-2'
                      : 'text-[#1D1D1D] hover:text-[#D31334]'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </nav>

          {/* Highlighted Pill Button: Sustainability & ESG + Bag */}
          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => onChangePage(activePage === 'esg' ? 'home' : 'esg')}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] ${
                activePage === 'esg'
                  ? 'bg-[#1D1D1D] text-white'
                  : 'bg-[#059669] text-white hover:bg-[#047857]'
              }`}
            >
              <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Sustainability &amp; ESG</span>
            </button>

            <button
              type="button"
              onClick={() => setBagOpen((o) => !o)}
              aria-expanded={bagOpen}
              className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold text-[#1D1D1D] hover:bg-neutral-50 whitespace-nowrap"
            >
              <ShoppingBag className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="font-mono tabular-nums">({totalBagItems})</span>
            </button>
          </div>
        </div>

        {/* Slide-down Bag Drawer */}
        {bagOpen && (
          <div className="absolute right-6 top-14 z-30 w-80 rounded-xl border border-neutral-200 bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-2.5">
              <span className="text-xs font-bold text-[#1D1D1D]">Shopping Bag (CAD)</span>
              <button
                type="button"
                onClick={() => setBagOpen(false)}
                aria-label="Close bag"
                className="rounded p-1 text-neutral-400 hover:text-[#1D1D1D]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            {bag.length === 0 ? (
              <p className="py-5 text-center text-xs text-neutral-500">
                Your bag is currently empty.
              </p>
            ) : (
              <div className="mt-3 space-y-3">
                {bag.map((entry) => (
                  <div
                    key={`${entry.product.id}-${entry.selectedColor}`}
                    className="flex items-center justify-between gap-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-[#1D1D1D]">{entry.product.name}</p>
                      <p className="text-[11px] text-neutral-500">
                        {entry.selectedColor} ·{' '}
                        <span className="font-mono tabular-nums">${entry.product.priceCad} CAD</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => updateBagQty(entry.product.id, entry.selectedColor, -1)}
                        className="rounded border border-neutral-200 p-1 hover:bg-neutral-50"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono tabular-nums">{entry.qty}</span>
                      <button
                        type="button"
                        onClick={() => updateBagQty(entry.product.id, entry.selectedColor, 1)}
                        className="rounded border border-neutral-200 p-1 hover:bg-neutral-50"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateBagQty(entry.product.id, entry.selectedColor, -entry.qty)
                        }
                        className="rounded p-1 text-neutral-400 hover:text-[#D31334]"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex items-center justify-between border-t border-neutral-100 pt-2.5 text-xs font-bold text-[#1D1D1D]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums">${bagSubtotal} CAD</span>
                </div>
              </div>
            )}
          </div>
        )}
      </header>

      {activePage === 'esg' ? (
        <SustainabilityEsgPage
          turns={turns}
          onBackToShop={() => onChangePage('home')}
          onOpenChat={onOpenChat}
        />
      ) : (
        <>
          {/* Section 1: Authentic Lululemon Winter Arrivals Hero Banner */}
          <section aria-label="New Winter Arrivals campaign" className="relative overflow-hidden bg-[#1D1D1D]">
            <div className={compact ? 'aspect-[16/9]' : 'aspect-[16/6.4] min-h-[340px]'}>
              <img
                src="/src/assets/images/lulu_winter_hero_1795112699764.jpg"
                alt="Models wearing matte black puffer jackets and bone Scuba half-zip fleece hoodies on a misty Vancouver winter boardwalk"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center"
              />
            </div>
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent"
            />
            <div className="absolute inset-0 mx-auto flex max-w-6xl flex-col justify-end p-6 sm:p-10">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/90">
                Winter 2026 Collection
              </p>
              <h1 className="mt-1.5 max-w-xl font-[var(--font-display)] text-3xl font-bold tracking-tight text-white sm:text-5xl [text-wrap:balance]">
                New Winter Arrivals.
              </h1>
              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed text-white/90">
                Plush Scuba fleece, buttery-soft Align™ layers, and weather-ready gear built for
                crisp Canadian mornings.
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => scrollToCatalog('Women')}
                  className="rounded-sm bg-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#1D1D1D] transition-colors hover:bg-neutral-100 whitespace-nowrap"
                >
                  Shop Women&apos;s
                </button>
                <button
                  type="button"
                  onClick={() => scrollToCatalog('Men')}
                  className="rounded-sm border border-white/80 bg-black/25 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-white backdrop-blur-sm transition-colors hover:bg-white hover:text-[#1D1D1D] whitespace-nowrap"
                >
                  Shop Men&apos;s
                </button>
              </div>
            </div>
          </section>

          {/* Section 2: Featured New Winter Arrivals Grid */}
          <section
            ref={catalogRef}
            aria-label="New Winter Arrivals catalog"
            className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8"
          >
            <div className="flex flex-wrap items-end justify-between gap-3 border-b border-neutral-200 pb-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#D31334]">
                  What&apos;s New This Season
                </p>
                <h2 className="mt-0.5 font-[var(--font-display)] text-2xl font-bold tracking-tight text-[#1D1D1D]">
                  {selectedNav === 'All' ? 'New Winter Arrivals & Guest Favourites' : `${selectedNav}'s Winter Edit`}
                </h2>
              </div>
              <div className="flex items-center gap-2 text-xs">
                {selectedNav !== 'All' && (
                  <button
                    type="button"
                    onClick={() => setSelectedNav('All')}
                    className="font-semibold text-[#D31334] hover:underline"
                  >
                    View all ({LULULEMON_PRODUCTS.length})
                  </button>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {visibleProducts.map((product) => {
                const activeColor = selectedColors[product.id] ?? product.swatches[0].name;
                return (
                  <article
                    key={product.id}
                    className="group flex flex-col transition-transform duration-200 hover:-translate-y-0.5"
                  >
                    <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg bg-[#F5F5F5]">
                      <img
                        src={product.image}
                        alt={product.name}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <button
                        type="button"
                        onClick={() => addToBag(product)}
                        className="absolute bottom-3 right-3 rounded-sm bg-white/95 px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#1D1D1D] opacity-0 shadow-sm transition-opacity duration-200 hover:bg-[#1D1D1D] hover:text-white group-hover:opacity-100 focus-visible:opacity-100"
                      >
                        Quick Add
                      </button>
                    </div>

                    {/* Swatch Dots */}
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        {product.swatches.map((swatch) => {
                          const isSelected = activeColor === swatch.name;
                          return (
                            <button
                              key={swatch.name}
                              type="button"
                              aria-label={`Select ${swatch.name} colour for ${product.name}`}
                              title={swatch.name}
                              onClick={() =>
                                setSelectedColors((prev) => ({
                                  ...prev,
                                  [product.id]: swatch.name,
                                }))
                              }
                              className={`h-4 w-4 rounded-full border transition-all ${
                                isSelected
                                  ? 'scale-110 border-[#1D1D1D] ring-1 ring-[#1D1D1D] ring-offset-1'
                                  : 'border-neutral-300 hover:border-neutral-500'
                              }`}
                              style={{ backgroundColor: swatch.hex }}
                            />
                          );
                        })}
                        <span className="ml-1 text-[11px] text-neutral-500">{activeColor}</span>
                      </div>
                      {product.tag && (
                        <span className="text-[11px] font-medium text-neutral-500">
                          {product.tag}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-3">
                      <h3 className="text-[15px] font-semibold text-[#1D1D1D]">{product.name}</h3>
                      <span className="shrink-0 font-mono text-[14px] font-semibold text-[#1D1D1D] tabular-nums">
                        ${product.priceCad} CAD
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-neutral-500">{product.subtitle}</p>

                    <button
                      type="button"
                      onClick={() => addToBag(product)}
                      className="mt-3 w-full rounded-sm border border-[#1D1D1D] bg-white px-3 py-2 text-xs font-bold uppercase tracking-wider text-[#1D1D1D] transition-colors hover:bg-[#1D1D1D] hover:text-white"
                    >
                      Add to Bag
                    </button>
                  </article>
                );
              })}
            </div>
          </section>

          {/* Section 3: Lululemon Quality Promise & Live Clean AI Sustainability Bar */}
          <section
            aria-label="Lululemon Canada services and live Clean AI sustainability tracker"
            className="border-t border-neutral-200 bg-[#FAFAFA] px-5 py-8 sm:px-8"
          >
            <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-2">
              {/* Brand Craftsmanship & Quality Promise */}
              <div className="flex flex-col justify-between rounded-xl border border-neutral-200 bg-white p-6">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-[#D31334]">
                    Designed in Vancouver
                  </p>
                  <h3 className="mt-1 font-[var(--font-display)] text-lg font-bold text-[#1D1D1D]">
                    Our Quality Promise &amp; Complimentary Hemming
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-neutral-600">
                    Every piece is engineered to outlast the season. Visit any Lululemon Canada
                    store for free hemming—or ask our Guest Education assistant about returns,
                    sizing, or Quality Promise replacements.
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={onOpenChat}
                    className="rounded-sm bg-[#1D1D1D] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white hover:bg-[#D31334]"
                  >
                    Ask Guest Support
                  </button>
                  <span className="text-xs text-neutral-500">
                    30-day free mail &amp; in-store returns
                  </span>
                </div>
              </div>

              {/* Embedded Real-Time EcoRoute Sustainability Tracker for Shoppers */}
              <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-white p-6">
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[#059669]">
                      <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>2026 Clean AI Sustainability Tracker</span>
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-[#059669] tabular-nums">
                      {turns.length} {turns.length === 1 ? 'chat' : 'chats'}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-neutral-600">
                    Every support question routed cleanly saves real data-centre electricity and
                    cooling water in real time.
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-xs tabular-nums">
                    <div className="rounded-lg bg-emerald-50/70 p-2.5">
                      <p className="font-sans text-[10px] text-neutral-500">Tokens Saved</p>
                      <p className="mt-0.5 font-bold text-[#1D1D1D]">
                        {sessionSavedTokens.toLocaleString()}
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50/70 p-2.5">
                      <p className="font-sans text-[10px] text-neutral-500">Electricity</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-bold text-[#1D1D1D]">
                        <Zap className="h-3 w-3 text-amber-600" aria-hidden="true" />
                        {sessionSavedWh.toFixed(2)} Wh
                      </p>
                    </div>
                    <div className="rounded-lg bg-emerald-50/70 p-2.5">
                      <p className="font-sans text-[10px] text-neutral-500">Water Saved</p>
                      <p className="mt-0.5 inline-flex items-center gap-1 font-bold text-[#1D1D1D]">
                        <Droplets className="h-3 w-3 text-sky-600" aria-hidden="true" />
                        {sessionSavedWaterMl.toFixed(1)} mL
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
                    <div
                      className="h-full rounded-full bg-[#059669] transition-all duration-500"
                      style={{ width: `${esgBarPercent}%` }}
                    />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => onChangePage('esg')}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline"
                  >
                    <span>Open Full Sustainability &amp; ESG Dashboard</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Footer ESG Badge */}
          <footer className="mt-auto border-t border-neutral-200 bg-white px-5 py-6 sm:px-8">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2.5 text-xs text-neutral-600">
                <span className="font-bold text-[#1D1D1D] lowercase">lululemon athletica canada</span>
                <span aria-hidden="true">·</span>
                <span>Complimentary Hemming</span>
                <span aria-hidden="true">·</span>
                <span>Free Shipping &amp; Returns</span>
              </div>

              <button
                type="button"
                onClick={() => onChangePage('esg')}
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-[#059669] transition-colors hover:bg-emerald-100"
              >
                <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Verified Clean AI by EcoRoute · View 2026 ESG Ledger</span>
              </button>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}
