import { ApolloServer } from '@apollo/server';
import { startStandaloneServer } from '@apollo/server/standalone';

const typeDefs = `#graphql
  type Warehouse {
    code: ID!
    name: String!
    city: String!
    country: String!
  }

  type Product {
    id: ID!
    name: String!
    sku: String!
    warehouse: String!
    stock: Int!
    demand: Int!
  }

  type KPI {
    data: String!
    stock: Int!
    demand: Int!
  }

  type Query {
    products(search: String, status: String, warehouse: String): [Product!]!
    warehouses: [Warehouse!]!
    kpis(range: String!): [KPI!]!
  }

  type Mutation {
    updateDemand(id: ID!, demand: Int!): Product!
    transferStock(id: ID!, from: String!, to: String!, qty: Int!): Product!
  }
`;

// Sample data
const products = [
  { id: 'P-1001', name: '12mm Hex Bolt', sku: 'HEX-12-100', warehouse: 'BLR-A', stock: 180, demand: 120 },
  { id: 'P-1002', name: 'Steel Washer', sku: 'WSR-08-500', warehouse: 'BLR-A', stock: 50, demand: 80 },
  { id: 'P-1003', name: 'M8 Nut', sku: 'NUT-08-200', warehouse: 'PNQ-C', stock: 80, demand: 80 },
  { id: 'P-1004', name: 'Bearing 608ZZ', sku: 'BRG-608-50', warehouse: 'DEL-B', stock: 24, demand: 120 },
];

const warehouses = [
  { code: 'BLR-A', name: 'Bangalore Alpha', city: 'Bengaluru', country: 'India' },
  { code: 'PNQ-C', name: 'Pune Charlie', city: 'Pune', country: 'India' },
  { code: 'DEL-B', name: 'Delhi Bravo', city: 'New Delhi', country: 'India' },
];

function statusOf(p) {
  if (p.stock < p.demand) return 'under';
  if (p.stock > p.demand) return 'over';
  return 'balanced';
}

const resolvers = {
  Query: {
    products: (_, { search, status, warehouse }) => {
      let result = products;
      if (search) {
        const s = search.toLowerCase();
        result = result.filter((p) => p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s));
      }
      if (warehouse) {
        result = result.filter((p) => p.warehouse === warehouse);
      }
      if (status) {
        const allowed = new Set(['under', 'over', 'balanced']);
        if (allowed.has(status)) {
          result = result.filter((p) => statusOf(p) === status);
        }
      }
      return result;
    },
    warehouses: () => warehouses,
    kpis: (_, { range }) => {
      const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
      const totalDemand = products.reduce((acc, p) => acc + p.demand, 0);
      const days = range === '14d' ? 14 : range === '30d' ? 30 : 7;
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      const series = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * dayMs);
        const label = d.toISOString().slice(0, 10); // YYYY-MM-DD
        // Deterministic oscillation for demo purposes
        const stock = Math.max(0, Math.round(totalStock * (0.9 + 0.2 * Math.sin((i + 1) / 3))));
        const demand = Math.max(0, Math.round(totalDemand * (0.9 + 0.2 * Math.cos((i + 2) / 4))));
        series.push({ data: label, stock, demand });
      }
      return series;
    },
  },
  Mutation: {
    updateDemand: (_, { id, demand }) => {
      const p = products.find((x) => x.id === id);
      if (!p) throw new Error(`Product ${id} not found`);
      p.demand = demand;
      return p;
    },
    transferStock: (_, { id, from, to, qty }) => {
      if (qty <= 0) throw new Error('qty must be > 0');
      const fromP = products.find((x) => x.id === id && x.warehouse === from);
      if (!fromP) throw new Error(`Product ${id} not found in warehouse ${from}`);
      if (fromP.stock < qty) throw new Error('insufficient stock to transfer');

      fromP.stock -= qty;

      // find same product in destination warehouse (by id)
      let toP = products.find((x) => x.id === id && x.warehouse === to);
      if (!toP) {
        toP = { ...fromP, warehouse: to, stock: 0 };
        products.push(toP);
      }
      toP.stock += qty;

      // Return the source product after transfer
      return fromP;
    },
  },
};

const server = new ApolloServer({ typeDefs, resolvers });

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`GraphQL ready at ${url}`);
