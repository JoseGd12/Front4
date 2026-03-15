type TableLoadingStateRowProps = {
  colSpan: number;
  title?: string;
  description?: string;
};

export function TableLoadingStateRow({
  colSpan,
  title = "Cargando información...",
  description = "Por favor espera un momento"
}: TableLoadingStateRowProps) {
  return (
    <tr>
      <td colSpan={colSpan} className="py-12 text-center">
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-primary mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white-primary mb-2">{title}</h3>
          <p className="text-gray-lightest">{description}</p>
        </div>
      </td>
    </tr>
  );
}
