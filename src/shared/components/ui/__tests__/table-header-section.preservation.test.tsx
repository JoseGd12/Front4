/**
 * Preservation Tests — TableHeaderSection
 *
 * **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**
 *
 * PROPÓSITO: Documentar el baseline de comportamiento que NO debe cambiar tras el fix.
 * Estos tests DEBEN PASAR en código sin corregir y también después del fix.
 *
 * Property 2: Preservation — Para todos los inputs donde la bug condition NO se cumple
 * (variante "default", onSearchChange ausente, props opcionales, slots de contenido),
 * el componente SHALL producir exactamente el mismo resultado de renderizado y comportamiento.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableHeaderSection } from '../table-header-section';

// ─── Suite 1: Variante "default" ─────────────────────────────────────────────

describe('Preservation: variante "default"', () => {
  /**
   * Test 1: variant="default" renderiza el componente Input de Shadcn con clase "elegante-input"
   * Observado en código sin corregir: el bloque default usa <Input className={cn("elegante-input w-80", ...)} />
   */
  it('P2 - default: renderiza input con clase "elegante-input"', () => {
    const onSearchChange = vi.fn();

    const { container } = render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
      />
    );

    // El Input de Shadcn renderiza un <input> en el DOM
    const input = container.querySelector('input');
    expect(input).not.toBeNull();

    // Debe tener la clase elegante-input (puede tener otras clases adicionales)
    expect(input?.className).toContain('elegante-input');
  });

  /**
   * Test 2: sin onSearchChange no se renderiza campo de búsqueda (variante default)
   * Observado: el bloque default guarda `{onSearchChange && (...)}` — nada se renderiza sin ella
   */
  it('P2 - default: sin onSearchChange no hay campo de búsqueda', () => {
    const { container } = render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        // onSearchChange intencionalmente ausente
      />
    );

    const input = container.querySelector('input');
    expect(input).toBeNull();
  });
});

// ─── Suite 2: Props opcionales ────────────────────────────────────────────────

describe('Preservation: props opcionales', () => {
  /**
   * Test 3: searchPlaceholder se aplica correctamente en variante default
   */
  it('P2 - default: searchPlaceholder se aplica al input', () => {
    const onSearchChange = vi.fn();
    const placeholder = 'Buscar productos...';

    render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder={placeholder}
      />
    );

    const input = screen.getByPlaceholderText(placeholder);
    expect(input).toBeInTheDocument();
  });

  /**
   * Test 4: searchPlaceholder se aplica correctamente en variante dark
   */
  it('P2 - dark: searchPlaceholder se aplica al input', () => {
    const onSearchChange = vi.fn();
    const placeholder = 'Buscar clientes...';

    render(
      <TableHeaderSection
        variant="dark"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder={placeholder}
      />
    );

    // En la variante dark hay dos inputs (desktop + mobile layout)
    const inputs = screen.getAllByPlaceholderText(placeholder);
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 5: searchInputClassName se aplica al input en variante default
   */
  it('P2 - default: searchInputClassName se aplica al input', () => {
    const onSearchChange = vi.fn();

    const { container } = render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        onSearchChange={onSearchChange}
        searchInputClassName="mi-clase-custom"
      />
    );

    const input = container.querySelector('input');
    expect(input?.className).toContain('mi-clase-custom');
  });

  /**
   * Test 6: searchContainerClassName se aplica al contenedor del buscador en variante default
   */
  it('P2 - default: searchContainerClassName se aplica al contenedor relativo', () => {
    const onSearchChange = vi.fn();

    const { container } = render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        onSearchChange={onSearchChange}
        searchContainerClassName="contenedor-custom"
      />
    );

    // El contenedor del input tiene clase "relative" más la custom
    const relativeDiv = container.querySelector('.relative');
    expect(relativeDiv).not.toBeNull();
    expect(relativeDiv?.className).toContain('contenedor-custom');
  });
});

// ─── Suite 3: Botón "×" (clear button) ───────────────────────────────────────

describe('Preservation: botón "×" de limpiar búsqueda', () => {
  /**
   * Test 7: con searchValue no vacío, el botón "×" aparece en variante default
   * Observado: `{searchValue && (<button ...><X /></button>)}` en ambas variantes
   */
  it('P2 - default: con searchValue no vacío aparece el botón "×"', () => {
    const onSearchChange = vi.fn();

    render(
      <TableHeaderSection
        variant="default"
        searchValue="abc"
        onSearchChange={onSearchChange}
      />
    );

    // El botón tiene title="Limpiar búsqueda"
    const clearBtn = screen.getByTitle('Limpiar búsqueda');
    expect(clearBtn).toBeInTheDocument();
  });

  /**
   * Test 8: con searchValue vacío, el botón "×" NO aparece en variante default
   */
  it('P2 - default: con searchValue vacío NO aparece el botón "×"', () => {
    const onSearchChange = vi.fn();

    render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        onSearchChange={onSearchChange}
      />
    );

    const clearBtn = screen.queryByTitle('Limpiar búsqueda');
    expect(clearBtn).toBeNull();
  });

  /**
   * Test 9: clic en "×" llama a onSearchChange("") en variante default
   */
  it('P2 - default: clic en "×" llama a onSearchChange("")', () => {
    const onSearchChange = vi.fn();

    render(
      <TableHeaderSection
        variant="default"
        searchValue="hola"
        onSearchChange={onSearchChange}
      />
    );

    const clearBtn = screen.getByTitle('Limpiar búsqueda');
    fireEvent.click(clearBtn);

    expect(onSearchChange).toHaveBeenCalledTimes(1);
    expect(onSearchChange).toHaveBeenCalledWith('');
  });

  /**
   * Test 10: con searchValue no vacío en variante dark, aparece el botón "×"
   */
  it('P2 - dark: con searchValue no vacío aparece el botón "×"', () => {
    const onSearchChange = vi.fn();

    render(
      <TableHeaderSection
        variant="dark"
        searchValue="xyz"
        onSearchChange={onSearchChange}
      />
    );

    // En dark hay dos layouts (desktop + mobile), puede haber más de un botón
    const clearBtns = screen.getAllByTitle('Limpiar búsqueda');
    expect(clearBtns.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 11: clic en "×" llama a onSearchChange("") en variante dark
   */
  it('P2 - dark: clic en "×" llama a onSearchChange("")', () => {
    const onSearchChange = vi.fn();

    render(
      <TableHeaderSection
        variant="dark"
        searchValue="test"
        onSearchChange={onSearchChange}
      />
    );

    // Hacer clic en el primer botón "×" disponible
    const clearBtns = screen.getAllByTitle('Limpiar búsqueda');
    fireEvent.click(clearBtns[0]);

    expect(onSearchChange).toHaveBeenCalledWith('');
  });
});

// ─── Suite 4: Slots de contenido ─────────────────────────────────────────────

describe('Preservation: slots de contenido', () => {
  /**
   * Test 12: leftContent se renderiza en variante default
   */
  it('P2 - default: leftContent se renderiza', () => {
    render(
      <TableHeaderSection
        variant="default"
        leftContent={<button>Agregar</button>}
      />
    );

    expect(screen.getByText('Agregar')).toBeInTheDocument();
  });

  /**
   * Test 13: leftContent se renderiza en variante dark
   * Nota: la variante dark renderiza dos layouts (desktop + mobile) en el DOM de jsdom,
   * por lo que leftContent aparece duplicado — comportamiento real del componente.
   */
  it('P2 - dark: leftContent se renderiza', () => {
    render(
      <TableHeaderSection
        variant="dark"
        leftContent={<button>Nueva venta</button>}
      />
    );

    // getAllByText porque el layout dark tiene desktop + mobile en el DOM simultáneamente
    const elements = screen.getAllByText('Nueva venta');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 14: recordsText se renderiza en variante default
   */
  it('P2 - default: recordsText se renderiza', () => {
    render(
      <TableHeaderSection
        variant="default"
        recordsText={<span>15 registros</span>}
        rightContent={<span>dummy</span>}
      />
    );

    expect(screen.getByText('15 registros')).toBeInTheDocument();
  });

  /**
   * Test 15: recordsText se renderiza en variante dark
   * Nota: la variante dark renderiza dos layouts (desktop + mobile) en el DOM de jsdom,
   * por lo que recordsText aparece duplicado — comportamiento real del componente.
   */
  it('P2 - dark: recordsText se renderiza', () => {
    render(
      <TableHeaderSection
        variant="dark"
        recordsText={<span>42 registros</span>}
      />
    );

    // getAllByText porque el layout dark tiene desktop + mobile en el DOM simultáneamente
    const elements = screen.getAllByText('42 registros');
    expect(elements.length).toBeGreaterThanOrEqual(1);
  });

  /**
   * Test 16: rightContent se renderiza en variante default
   */
  it('P2 - default: rightContent se renderiza', () => {
    render(
      <TableHeaderSection
        variant="default"
        rightContent={<button>Exportar</button>}
      />
    );

    expect(screen.getByText('Exportar')).toBeInTheDocument();
  });

  /**
   * Test 17: extraFilters se renderiza en variante default
   */
  it('P2 - default: extraFilters se renderiza', () => {
    render(
      <TableHeaderSection
        variant="default"
        extraFilters={<div>Filtro extra</div>}
      />
    );

    expect(screen.getByText('Filtro extra')).toBeInTheDocument();
  });
});

// ─── Suite 5: Sin onSearchChange ──────────────────────────────────────────────

describe('Preservation: sin onSearchChange no se renderiza buscador', () => {
  /**
   * Test 18: variante "dark" sin onSearchChange no renderiza input de búsqueda
   * Observado: DarkSearchBar devuelve null cuando !onSearchChange
   */
  it('P2 - dark: sin onSearchChange no se renderiza el input de búsqueda', () => {
    const { container } = render(
      <TableHeaderSection
        variant="dark"
        searchValue=""
        // onSearchChange ausente
      />
    );

    // No debe haber input de tipo text
    const inputs = container.querySelectorAll('input[type="text"]');
    expect(inputs.length).toBe(0);
  });

  /**
   * Test 19: variante "default" sin onSearchChange no renderiza input de búsqueda
   */
  it('P2 - default: sin onSearchChange no se renderiza el input de búsqueda', () => {
    const { container } = render(
      <TableHeaderSection
        variant="default"
        searchValue=""
        // onSearchChange ausente
      />
    );

    const input = container.querySelector('input');
    expect(input).toBeNull();
  });
});
