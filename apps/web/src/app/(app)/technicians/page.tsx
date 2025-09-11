import Link from "next/link";

import { listTechnicians, parseSkillTags } from "@acme/db";

import { Pager } from "@/components/Pager";
import { formatCents } from "@/lib/format";

const PER_PAGE = 25;

interface SearchParams {
  skill?: string;
  is_active?: string;
  page?: string;
}

export default async function TechniciansPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await props.searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const skill = params.skill?.trim() || undefined;
  const isActive =
    params.is_active === "true" ? true : params.is_active === "false" ? false : undefined;
  const result = await listTechnicians({ skill, isActive }, { page, perPage: PER_PAGE });

  return (
    <>
      <div className="page-head">
        <h1>Technicians</h1>
        <Link className="button" href="/technicians/new">
          Add technician
        </Link>
      </div>

      <form className="filters" method="get">
        <label>
          Skill
          <input name="skill" defaultValue={skill ?? ""} placeholder="hvac" />
        </label>
        <label>
          Status
          <select name="is_active" defaultValue={params.is_active ?? ""}>
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </label>
        <button className="secondary" type="submit">
          Filter
        </button>
      </form>

      {result.items.length === 0 ? (
        <p className="empty">No technicians match those filters.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Skills</th>
              <th className="num">Hourly cost</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {result.items.map((technician) => (
              <tr key={technician.id}>
                <td>
                  <Link href={`/technicians/${technician.id}`}>{technician.name}</Link>
                </td>
                <td>{parseSkillTags(technician.skillTags).join(", ") || "—"}</td>
                <td className="num">{formatCents(technician.hourlyCostCents)}</td>
                <td>
                  {technician.isActive ? (
                    "Active"
                  ) : (
                    <span className="badge inactive">inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pager
        page={result.page}
        perPage={result.perPage}
        total={result.total}
        basePath="/technicians"
        query={{ skill, is_active: params.is_active }}
      />
    </>
  );
}
