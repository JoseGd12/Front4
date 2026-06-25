/**
 * Bug Condition Exploration Test — TableHeaderSection variant="dark"
 *
 * **Validates: Requirements 1.1, 1.2**
 *
 * PROPÓSITO: Demostrar que el bug EXISTS en el código SIN corregir.
 * Estos tests DEBEN FALLAR antes del fix y PASAR después del fix.
 *
 * Bug: DarkSearchBar se define como función inline dentro del cuerpo de
 * TableHeaderSection. React crea un tipo de componente nuevo en cada render,
 * desmontando y remontando el <input>, lo que causa pérdida de foco.
 *
 * Property 1: Bug Condition — El nodo DOM del <input> NO se desmonta entre
 * renders consecutivos (variant="dark" + onSearchChange definido + cambio de searchValue).
 */

import { render, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TableHeaderSection } from '../table-header-section';

// ─── Helper: obtiene el nodo <input> dentro del container ───────────────────
function getInputNode(container: HTMLElement): HTMLInputElement | null {
  return container.querySelector('input[type="text"]');
}

// ─── Suite: Bug Condition — DOM Identity ────────────────────────────────────

describe('Bug Condition: TableHeaderSection variant="dark" — DOM identity entre renders', () => {
  /**
   * Test 1: keystroke simple
   * Simula que el usuario escribe "a" en el buscador.
   * inputNode1 y inputNode2 deben ser el MISMO nodo DOM.
   * FALLA en código sin corregir: el nodo cambia porque DarkSearchBar es inline.
   */
  it('P1 - keystroke simple: el nodo DOM del input NO cambia tras actualizar searchValue de "" a "a"', () => {
    const onSearchChange = vi.fn();

    const { container, rerender } = render(
      <TableHeaderSection
        variant="dark"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
      />
    );

    // Capturar referencia antes del re-render
    const inputNode1 = getInputNode(container);
    expect(inputNode1).not.toBeNull();

    // Simular keystroke: cambio de searchValue de "" → "a"
    act(() => {
      rerender(
        <TableHeaderSection
          variant="dark"
          searchValue="a"
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar..."
        />
      );
    });

    // Capturar referencia después del re-render
    const inputNode2 = getInputNode(container);
    expect(inputNode2).not.toBeNull();

    // ASSERTION PRINCIPAL: mismo nodo DOM (no desmontado)
    // Esta línea FALLA en código sin corregir
    expect(inputNode1).toBe(inputNode2);
  });

  /**
   * Test 2: múltiples keystrokes consecutivos (≥5)
   * Simula que el usuario escribe "hola!" carácter a carácter.
   * El nodo DOM debe ser el MISMO a través de todos los renders.
   * FALLA en código sin corregir desde el primer keystroke.
   */
  it('P1 - múltiples keystrokes (≥5): el nodo DOM del input es estable a través de 5 renders consecutivos', () => {
    const onSearchChange = vi.fn();
    const keystrokes = ['h', 'ho', 'hol', 'hola', 'hola!'];

    const { container, rerender } = render(
      <TableHeaderSection
        variant="dark"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
      />
    );

    // Capturar referencia inicial
    const inputNodeOriginal = getInputNode(container);
    expect(inputNodeOriginal).not.toBeNull();

    for (const value of keystrokes) {
      act(() => {
        rerender(
          <TableHeaderSection
            variant="dark"
            searchValue={value}
            onSearchChange={onSearchChange}
            searchPlaceholder="Buscar..."
          />
        );
      });

      const inputNodeAfter = getInputNode(container);
      // ASSERTION: mismo nodo DOM en cada keystroke
      // Esta línea FALLA en código sin corregir
      expect(inputNodeAfter).toBe(inputNodeOriginal);
    }
  });

  /**
   * Test 3: clear button
   * Simula que el usuario hace clic en "×" para limpiar la búsqueda.
   * El nodo DOM debe ser el MISMO antes y después de limpiar.
   * FALLA en código sin corregir: el nodo cambia al re-render.
   */
  it('P1 - clear button: el nodo DOM del input NO cambia al limpiar searchValue ("abc" → "")', () => {
    const onSearchChange = vi.fn();

    const { container, rerender } = render(
      <TableHeaderSection
        variant="dark"
        searchValue="abc"
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
      />
    );

    // Capturar referencia con texto
    const inputNode1 = getInputNode(container);
    expect(inputNode1).not.toBeNull();

    // Simular clear: searchValue vuelve a ""
    act(() => {
      rerender(
        <TableHeaderSection
          variant="dark"
          searchValue=""
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar..."
        />
      );
    });

    // Capturar referencia después del clear
    const inputNode2 = getInputNode(container);
    expect(inputNode2).not.toBeNull();

    // ASSERTION: mismo nodo DOM
    // Esta línea FALLA en código sin corregir
    expect(inputNode1).toBe(inputNode2);
  });

  /**
   * Test 4: layout mobile
   * Verifica la estabilidad del nodo DOM en el layout mobile (sm:hidden).
   * En mobile se renderiza un segundo <input> dentro del bloque flex sm:hidden.
   * Ambos nodos deben ser estables entre renders.
   *
   * Nota: jsdom no tiene window.matchMedia real, pero ambos layouts se renderizan
   * en el DOM; verificamos el primer input encontrado (que es el del desktop en el
   * orden del DOM), ya que ambos comparten el mismo DarkSearchBar inline buggy.
   */
  it('P1 - layout mobile: el nodo DOM del input en el bloque mobile NO cambia tras keystroke', () => {
    const onSearchChange = vi.fn();

    const { container, rerender } = render(
      <TableHeaderSection
        variant="dark"
        searchValue=""
        onSearchChange={onSearchChange}
        searchPlaceholder="Buscar..."
      />
    );

    // En el DOM renderizado por jsdom, ambos bloques (desktop y mobile) están presentes.
    // Capturamos TODOS los inputs
    const inputs1 = container.querySelectorAll('input[type="text"]');
    expect(inputs1.length).toBeGreaterThanOrEqual(1);

    // Guardamos referencias a todos los nodos
    const inputNodes1 = Array.from(inputs1);

    act(() => {
      rerender(
        <TableHeaderSection
          variant="dark"
          searchValue="m"
          onSearchChange={onSearchChange}
          searchPlaceholder="Buscar..."
        />
      );
    });

    const inputs2 = container.querySelectorAll('input[type="text"]');
    const inputNodes2 = Array.from(inputs2);

    // Mismo número de inputs
    expect(inputNodes2.length).toBe(inputNodes1.length);

    // ASSERTION: cada nodo debe ser el mismo (no desmontado)
    // Esta línea FALLA en código sin corregir para cada input en el layout mobile
    inputNodes1.forEach((node, i) => {
      expect(node).toBe(inputNodes2[i]);
    });
  });
});
