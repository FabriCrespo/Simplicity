/** Helpers para armar opciones al estilo del catálogo Simplicity. */

export type VariantMode =
  | "none"
  | "colors"
  | "sizes"
  | "color_then_size"
  | "size_then_color";

export type SizePreset = "letters" | "fitted" | "numeric" | "custom";

export const SIZE_PRESETS: Record<Exclude<SizePreset, "custom">, string[]> = {
  letters: ["S", "M", "L", "XL"],
  fitted: ["S/M", "M/L"],
  numeric: ["36", "38", "40", "42"],
};

export const COMMON_COLORS = [
  "Negro",
  "Blanco",
  "Nude",
  "Marfil",
  "Rojo",
  "Rosa",
  "Celeste",
  "Azul",
  "Verde",
  "Café",
  "Lila",
  "Beige",
  "Gris",
];

export type BuiltChoice = {
  id: string;
  title: string;
  price: number;
  enabled: boolean;
  currentStock: number;
  handleStock: boolean;
};

export type BuiltGroup = {
  id: string;
  title: string;
  required: boolean;
  count: number;
  value: unknown[];
  options: BuiltChoice[];
};

function uid(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}

function choice(
  title: string,
  opts?: { price?: number; enabled?: boolean; stock?: number; track?: boolean },
): BuiltChoice {
  return {
    id: uid("c"),
    title,
    price: opts?.price ?? 0,
    enabled: opts?.enabled ?? true,
    currentStock: opts?.stock ?? 0,
    handleStock: opts?.track ?? false,
  };
}

export function parseList(raw: string): string[] {
  return raw
    .split(/[,;\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function resolveSizes(
  preset: SizePreset,
  custom: string,
): string[] {
  if (preset === "custom") return parseList(custom);
  return SIZE_PRESETS[preset];
}

export function buildVariantGroups(input: {
  mode: VariantMode;
  colors: string[];
  sizes: string[];
  trackStock: boolean;
  stockPerChoice?: number;
}): BuiltGroup[] {
  const { mode, colors, sizes, trackStock } = input;
  const stock = input.stockPerChoice ?? 0;

  if (mode === "none") return [];

  if (mode === "colors") {
    if (!colors.length) return [];
    return [
      {
        id: uid("g"),
        title: "Tono",
        required: false,
        count: 1,
        value: [],
        options: colors.map((c) =>
          choice(c, { track: trackStock, stock }),
        ),
      },
    ];
  }

  if (mode === "sizes") {
    if (!sizes.length) return [];
    return [
      {
        id: uid("g"),
        title: "Talla",
        required: false,
        count: 1,
        value: [],
        options: sizes.map((s) =>
          choice(s, { track: trackStock, stock }),
        ),
      },
    ];
  }

  // Un grupo por color → choices = tallas (patrón más común en el catálogo)
  if (mode === "color_then_size") {
    if (!colors.length || !sizes.length) return [];
    return colors.map((color) => ({
      id: uid("g"),
      title: color,
      required: false,
      count: 1,
      value: [],
      options: sizes.map((s) => choice(s, { track: trackStock, stock })),
    }));
  }

  // Un grupo por talla → choices = colores
  if (mode === "size_then_color") {
    if (!colors.length || !sizes.length) return [];
    return sizes.map((size) => ({
      id: uid("g"),
      title: `Talla ${size}`,
      required: false,
      count: 1,
      value: [],
      options: colors.map((c) => choice(c, { track: trackStock, stock })),
    }));
  }

  return [];
}

export const VARIANT_MODE_HELP: Record<
  VariantMode,
  { label: string; hint: string; example: string }
> = {
  none: {
    label: "Sin variantes",
    hint: "Talla única, un solo SKU (accesorios, gift cards, etc.).",
    example: "Gift Card · Cinturón único",
  },
  colors: {
    label: "Solo colores",
    hint: "Misma talla, distintos tonos. Grupo «Tono».",
    example: "Basic Top Recto → Blanco, Nude, Negro…",
  },
  sizes: {
    label: "Solo tallas",
    hint: "Un color, varias tallas. Grupo «Talla».",
    example: "Denim Cargo → 36, 38, 40, 42",
  },
  color_then_size: {
    label: "Color → tallas",
    hint: "Elegís color y después talla. Un grupo por color.",
    example: "Short Alabama → Celeste (36–42), Azul (36–42)",
  },
  size_then_color: {
    label: "Talla → colores",
    hint: "Elegís talla y después color. Un grupo por talla.",
    example: "Chaleco Cargo → Talla S/M (Perla, Negro…)",
  },
};
