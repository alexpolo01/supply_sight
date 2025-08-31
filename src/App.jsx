import { useMemo, useState } from 'react'
import { gql, useMutation, useQuery } from '@apollo/client'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import './App.css'

const QUERY_DASHBOARD = gql`
  query Dashboard($search: String, $status: String, $warehouse: String, $range: String!) {
    products(search: $search, status: $status, warehouse: $warehouse) {
      id
      name
      sku
      warehouse
      stock
      demand
    }
    warehouses { code name city country }
    kpis(range: $range) { data stock demand }
  }
`;

const MUT_UPDATE_DEMAND = gql`
  mutation UpdateDemand($id: ID!, $demand: Int!) {
    updateDemand(id: $id, demand: $demand) { id demand stock warehouse name sku }
  }
`;

const MUT_TRANSFER_STOCK = gql`
  mutation TransferStock($id: ID!, $from: String!, $to: String!, $qty: Int!) {
    transferStock(id: $id, from: $from, to: $to, qty: $qty) { id stock warehouse name sku demand }
  }
`;

function statusOf(p){
  if(p.stock > p.demand) return 'Healthy'
  if(p.stock === p.demand) return 'Low'
  return 'Critical'
}

function pillColor(status){
  return status === 'Healthy' ? 'bg-green-100 text-green-700' : status==='Low' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'
}

function App(){
  const [range, setRange] = useState('7d')
  const [search, setSearch] = useState('')
  const [warehouse, setWarehouse] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const mapStatusToServer = (s)=>{
    if(!s) return ''
    if(s==='Healthy') return 'over'
    if(s==='Low') return 'balanced'
    if(s==='Critical') return 'under'
    return ''
  }

  const { data, loading, refetch } = useQuery(QUERY_DASHBOARD, { variables: { search, status: mapStatusToServer(status), warehouse, range } })
  const [updateDemand] = useMutation(MUT_UPDATE_DEMAND, { onCompleted: () => refetch() })
  const [transferStock] = useMutation(MUT_TRANSFER_STOCK, { onCompleted: () => refetch() })

  const products = data?.products ?? []
  const warehouses = data?.warehouses ?? []
  const kpis = data?.kpis ?? []

  const totals = useMemo(()=>{
    const totalStock = products.reduce((a,p)=>a+p.stock,0)
    const totalDemand = products.reduce((a,p)=>a+p.demand,0)
    const minSum = products.reduce((a,p)=>a+Math.min(p.stock,p.demand),0)
    const fillRate = totalDemand>0 ? Math.round((minSum/totalDemand)*100) : 0
    return { totalStock, totalDemand, fillRate }
  },[products])

  const paged = useMemo(()=>{
    const start = (page-1)*pageSize
    return products.slice(start, start+pageSize)
  },[products,page])

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize))

  const [drawer, setDrawer] = useState(null) // product or null

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      {/* Top bar */}
      <header className="sticky top-0 z-10 bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="font-bold text-xl">SupplySight</div>
          <div className="flex gap-2">
            {['7d','14d','30d'].map(r=> (
              <button key={r} onClick={()=>{setRange(r); refetch({ search, warehouse, status: mapStatusToServer(status), range: r })}}
                className={`px-3 py-1 rounded-full border ${range===r?'bg-gray-900 text-white':'bg-white'}`}>{r}</button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* KPI cards */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="p-4 bg-white rounded-lg shadow border">
            <div className="text-sm text-gray-500">Total Stock</div>
            <div className="text-2xl font-semibold">{totals.totalStock}</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow border">
            <div className="text-sm text-gray-500">Total Demand</div>
            <div className="text-2xl font-semibold">{totals.totalDemand}</div>
          </div>
          <div className="p-4 bg-white rounded-lg shadow border">
            <div className="text-sm text-gray-500">Fill Rate</div>
            <div className="text-2xl font-semibold">{totals.fillRate}%</div>
          </div>
        </section>

        {/* Chart */}
        <section className="mb-6 p-4 bg-white rounded-lg shadow border h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={kpis}>
              <XAxis dataKey="data" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="stock" stroke="#0ea5e9" strokeWidth={2} />
              <Line type="monotone" dataKey="demand" stroke="#ef4444" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </section>

        {/* Filters */}
        <section className="mb-4 flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
          <div className="flex-1">
            <label className="block text-sm text-gray-600 mb-1">Search</label>
            <input value={search} onChange={(e)=>{const v=e.target.value; setSearch(v); setPage(1); refetch({ search: v, warehouse, status: mapStatusToServer(status), range })}} className="w-full border rounded px-3 py-2" placeholder="Name, SKU, ID" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Warehouse</label>
            <select value={warehouse} onChange={(e)=>{const v=e.target.value; setWarehouse(v); setPage(1); refetch({ search, warehouse: v, status: mapStatusToServer(status), range })}} className="border rounded px-3 py-2 min-w-40">
              <option value="">All</option>
              {warehouses.map(w=> <option key={w.code} value={w.code}>{w.code} - {w.city}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Status</label>
            <select value={status} onChange={(e)=>{const v=e.target.value; setStatus(v); setPage(1); refetch({ search, warehouse, status: mapStatusToServer(v), range })}} className="border rounded px-3 py-2 min-w-36">
              <option value="">All</option>
              <option>Healthy</option>
              <option>Low</option>
              <option>Critical</option>
            </select>
          </div>
        </section>

        {/* Products table */}
        <section className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left">
              <thead className="bg-gray-50">
                <tr className="text-sm text-gray-600">
                  <th className="px-4 py-2">Product</th>
                  <th className="px-4 py-2">SKU</th>
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2">Stock</th>
                  <th className="px-4 py-2">Demand</th>
                  <th className="px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {paged.map(p=>{
                  const st = statusOf(p)
                  return (
                    <tr key={p.id} onClick={()=>setDrawer(p)} className={`cursor-pointer hover:bg-gray-50 ${st==='Critical'?'bg-red-50/40':''}`}>
                      <td className="px-4 py-2 font-medium">{p.name}</td>
                      <td className="px-4 py-2">{p.sku}</td>
                      <td className="px-4 py-2">{p.warehouse}</td>
                      <td className="px-4 py-2">{p.stock}</td>
                      <td className="px-4 py-2">{p.demand}</td>
                      <td className="px-4 py-2"><span className={`text-xs px-2 py-1 rounded-full ${pillColor(st)}`}>{st}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-sm text-gray-600">Page {page} / {totalPages}</div>
            <div className="flex gap-2">
              <button onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-1 border rounded" disabled={page===1}>Prev</button>
              <button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="px-3 py-1 border rounded" disabled={page===totalPages}>Next</button>
            </div>
          </div>
        </section>
      </main>

      {/* Drawer */}
      {drawer && (
        <aside className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-white shadow-xl border-l p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">{drawer.name}</h2>
            <button onClick={()=>setDrawer(null)} className="px-3 py-1 border rounded">Close</button>
          </div>
          <div className="space-y-2 text-sm">
            <div><span className="text-gray-600">ID:</span> {drawer.id}</div>
            <div><span className="text-gray-600">SKU:</span> {drawer.sku}</div>
            <div><span className="text-gray-600">Warehouse:</span> {drawer.warehouse}</div>
            <div><span className="text-gray-600">Stock:</span> {drawer.stock}</div>
            <div><span className="text-gray-600">Demand:</span> {drawer.demand}</div>
            <div><span className="text-gray-600">Status:</span> {statusOf(drawer)}</div>
          </div>

          <hr className="my-4" />

          {/* Update Demand */}
          <UpdateDemandForm product={drawer} onSubmit={async (d)=>{
            await updateDemand({ variables: { id: drawer.id, demand: d } })
            setDrawer(null)
          }} />

          <hr className="my-4" />

          {/* Transfer Stock */}
          <TransferStockForm product={drawer} warehouses={warehouses} onSubmit={async ({from,to,qty})=>{
            await transferStock({ variables: { id: drawer.id, from, to, qty } })
            setDrawer(null)
          }} />
        </aside>
      )}
    </div>
  )
}

function UpdateDemandForm({ product, onSubmit }){
  const [val, setVal] = useState(product.demand)
  return (
    <div>
      <h3 className="font-semibold mb-2">Update Demand</h3>
      <div className="flex gap-2">
        <input type="number" className="border rounded px-3 py-2 w-40" value={val} onChange={e=>setVal(parseInt(e.target.value||'0',10))} />
        <button className="px-3 py-2 border rounded bg-gray-900 text-white" onClick={()=>onSubmit(val)}>Save</button>
      </div>
    </div>
  )
}

function TransferStockForm({ product, warehouses, onSubmit }){
  const [from] = useState(product.warehouse)
  const [to, setTo] = useState('')
  const [qty, setQty] = useState(0)
  return (
    <div>
      <h3 className="font-semibold mb-2">Transfer Stock</h3>
      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-sm text-gray-600 mb-1">From</label>
          <input value={from} disabled className="border rounded px-3 py-2 w-40 bg-gray-100" />
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">To</label>
          <select value={to} onChange={e=>setTo(e.target.value)} className="border rounded px-3 py-2 w-40">
            <option value="">Select</option>
            {warehouses.filter(w=>w.code!==from).map(w=> <option key={w.code} value={w.code}>{w.code} - {w.city}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Quantity</label>
          <input type="number" className="border rounded px-3 py-2 w-40" value={qty} onChange={e=>setQty(parseInt(e.target.value||'0',10))} />
        </div>
        <div>
          <button disabled={!to||qty<=0} className="px-3 py-2 border rounded bg-gray-900 text-white disabled:opacity-50" onClick={()=>onSubmit({from,to,qty})}>Transfer</button>
        </div>
      </div>
    </div>
  )
}

export default App
