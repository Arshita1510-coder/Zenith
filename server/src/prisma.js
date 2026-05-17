let prismaInstance = null;
let prismaError = null;

async function getPrisma() {
  if (prismaInstance) return prismaInstance;
  if (prismaError) throw prismaError;

  try {
    const { PrismaClient } = await import("@prisma/client");
    prismaInstance = new PrismaClient();
    return prismaInstance;
  } catch (error) {
    prismaError = error;
    console.warn("Prisma Client failed to load dynamically. Database features are disabled, falling back to demoStore.", error.message);
    throw error;
  }
}

// Export a Proxy that intercepts access to any property (e.g. prisma.user, prisma.$connect)
export const prisma = new Proxy({}, {
  get(target, prop) {
    // If the accessed property starts with '$', handle it as a direct client method/property
    if (typeof prop === "string" && prop.startsWith("$")) {
      return async (...args) => {
        const client = await getPrisma();
        if (typeof client[prop] === "function") {
          return await client[prop](...args);
        }
        return client[prop];
      };
    }

    // Otherwise, handle as a model accessor (e.g., prisma.user.findUnique)
    return new Proxy({}, {
      get(subTarget, method) {
        return async (...args) => {
          try {
            const client = await getPrisma();
            return await client[prop][method](...args);
          } catch (err) {
            throw new Error(`Prisma operation failed: ${err.message}`);
          }
        };
      }
    });
  }
});
