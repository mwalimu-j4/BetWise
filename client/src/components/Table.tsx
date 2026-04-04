import type { ReactNode } from "react";

type Props = {
  headers: string[];
  children: ReactNode;
};

export default function Table({ headers, children }: Props) {
  return (
    <div className="overflow-x-auto rounded-xl border border-[#2a3f55] bg-[#1e2d3d]">
      <table className="min-w-full text-sm">
        <thead className="bg-[#1a2634] text-left text-[#8fa3b1]">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-4 py-3 font-semibold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}
