const API_BASE =
  (import.meta as any).env?.VITE_API_BASE || "http://localhost:4000/api";

async function fetchJson(url: string, init?: RequestInit) {
  const headers: Record<string, string> = { ...((init?.headers as any) || {}) };
  // Only set JSON content-type when sending a body (POST/PUT/PATCH)
  if (init?.body && !("Content-Type" in headers))
    headers["Content-Type"] = "application/json";
  const resp = await fetch(url, { headers, ...init });
  const text = await resp.text();
  let data: any;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!resp.ok) {
    const err: any = new Error(`HTTP ${resp.status}`);
    err.response = { data };
    throw err;
  }
  return data;
}

export async function getEligibility(emailid: string) {
  return fetchJson(
    `${API_BASE}/eligibility?emailid=${encodeURIComponent(emailid)}`
  );
}

export async function submitRequest(body: {
  employeeid: string;
  emailid: string;
  item_category: string;
  amount: number;
  justification: string;
}) {
  return fetchJson(`${API_BASE}/requests`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function approveRequest(
  id: string,
  body: { approver_email: string; notes?: string }
) {
  return fetchJson(`${API_BASE}/requests/${encodeURIComponent(id)}/approve`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function rejectRequest(
  id: string,
  body: { approver_email: string; notes?: string }
) {
  return fetchJson(`${API_BASE}/requests/${encodeURIComponent(id)}/reject`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getTransactions(params: {
  employeeid: string;
  from?: string;
  to?: string;
}) {
  const q = new URLSearchParams();
  q.set("employeeid", params.employeeid);
  if (params.from) q.set("from", params.from);
  if (params.to) q.set("to", params.to);
  return fetchJson(`${API_BASE}/transactions?${q.toString()}`);
}

export async function askPolicy(emailid: string, question: string) {
  const q = new URLSearchParams();
  q.set("emailid", emailid);
  q.set("question", question);
  return fetchJson(`${API_BASE}/qa?${q.toString()}`);
}

export async function predictApproval(body: {
  employeeid: string;
  emailid: string;
  item_category: string;
  amount: number;
  justification: string;
}) {
  return fetchJson(`${API_BASE}/predict`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function getPolicyForLevel(level: string) {
  const q = new URLSearchParams();
  q.set("level", level);
  return fetchJson(`${API_BASE}/policy?${q.toString()}`);
}

export async function getBalance(employeeid: string) {
  const q = new URLSearchParams();
  q.set("employeeid", employeeid);
  return fetchJson(`${API_BASE}/balances?${q.toString()}`);
}

export async function countEmployees(filters: {
  level?: string;
  department?: string;
  designation?: string;
  role?: string;
}) {
  const q = new URLSearchParams();
  if (filters.level) q.set("level", filters.level);
  if (filters.department) q.set("department", filters.department);
  // Support both keys; backend treats them the same
  const desig = filters.designation || filters.role;
  if (desig) q.set("designation", desig);
  return fetchJson(`${API_BASE}/employees/count?${q.toString()}`);
}

export async function adjustBalance(body: {
  employeeid: string;
  delta: number;
  notes?: string;
}) {
  return fetchJson(`${API_BASE}/balances/adjust`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

// New helpers: employee search and set purchase limit
export async function searchEmployees(params: {
  name?: string;
  emailid?: string;
  employeeid?: string;
}) {
  const q = new URLSearchParams();
  if (params.name) q.set("name", params.name);
  if (params.emailid) q.set("emailid", params.emailid);
  if (params.employeeid) q.set("employeeid", params.employeeid);
  return fetchJson(`${API_BASE}/employees/search?${q.toString()}`);
}

export async function setPurchaseLimit(body: {
  employeeid: string;
  new_limit: number;
  notes?: string;
}) {
  return fetchJson(`${API_BASE}/balances/set-limit`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function listRequests(params: {
  employeeid?: string;
  status?: string;
}) {
  const q = new URLSearchParams();
  if (params.employeeid) q.set("employeeid", params.employeeid);
  if (params.status) q.set("status", params.status);
  return fetchJson(`${API_BASE}/requests?${q.toString()}`);
}
