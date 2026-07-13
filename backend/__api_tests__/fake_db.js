// In-memory Mongoose adapter used ONLY for testing in this sandbox (no live
// MongoDB available). Patches each Model's persistence methods to operate on
// an in-memory array while using REAL Mongoose document instances (via
// `Model.hydrate`) so schema validation, defaults, casting, virtuals, and
// subdocument methods (.id(), .pull()) all behave exactly as they would
// against a real database. Not shipped — lives only in __api_tests__/.

function patchModel(Model, seed = []) {
  const store = seed.map((d) => JSON.parse(JSON.stringify(d)));

  function matches(doc, filter = {}) {
    return Object.entries(filter).every(([key, val]) => {
      if (val === undefined) return true;
      if (val && typeof val === 'object' && !Array.isArray(val) && !(val instanceof Date)) {
        return Object.entries(val).every(([op, opVal]) => {
          const docVal = doc[key] instanceof Date ? doc[key] : new Date(doc[key]);
          const cmpVal = opVal instanceof Date ? opVal : new Date(opVal);
          switch (op) {
            case '$ne': return doc[key] !== opVal;
            case '$gte': return docVal >= cmpVal || String(doc[key]) >= String(opVal);
            case '$gt': return docVal > cmpVal || String(doc[key]) > String(opVal);
            case '$lte': return docVal <= cmpVal || String(doc[key]) <= String(opVal);
            case '$lt': return docVal < cmpVal || String(doc[key]) < String(opVal);
            default: return true;
          }
        });
      }
      return String(doc[key]) === String(val);
    });
  }

  function sortDocs(docs, sortSpec) {
    if (!sortSpec) return docs;
    const entries = Object.entries(sortSpec);
    return docs.slice().sort((a, b) => {
      for (const [key, dir] of entries) {
        const av = a[key] ?? 0;
        const bv = b[key] ?? 0;
        if (av < bv) return dir === 1 ? -1 : 1;
        if (av > bv) return dir === 1 ? 1 : -1;
      }
      return 0;
    });
  }

  // A minimal stand-in for Mongoose's Query class: chainable methods
  // (.sort/.populate/.select) mutate how `resolve()` computes its result,
  // while .then/.catch/.finally delegate to a REAL Promise so the object is
  // a fully spec-compliant thenable (supports `await`, `.then().catch()`,
  // `Promise.all([...])`, etc. — exactly like a real Mongoose query).
  function makeQuery(resolveFn) {
    let sortSpec = null;
    const query = {
      sort(spec) {
        sortSpec = spec;
        return query;
      },
      populate() {
        return query;
      },
      select() {
        return query;
      },
      then(onFulfilled, onRejected) {
        const promise = new Promise((resolve, reject) => {
          try {
            resolve(resolveFn(sortSpec));
          } catch (e) {
            reject(e);
          }
        });
        return promise.then(onFulfilled, onRejected);
      },
      catch(onRejected) {
        return query.then(undefined, onRejected);
      },
      finally(onFinally) {
        return query.then(
          (v) => { onFinally(); return v; },
          (e) => { onFinally(); throw e; }
        );
      },
    };
    return query;
  }

  Model.find = (filter = {}) => {
    return makeQuery((sortSpec) => {
      let results = store.filter((d) => matches(d, filter));
      if (sortSpec) results = sortDocs(results, sortSpec);
      return results.map((d) => Model.hydrate(d));
    });
  };

  Model.findOne = (filter = {}) => {
    return makeQuery(() => {
      const found = store.find((d) => matches(d, filter));
      return found ? Model.hydrate(found) : null;
    });
  };

  Model.findById = (id) => {
    return makeQuery(() => {
      const found = store.find((d) => String(d._id) === String(id));
      return found ? Model.hydrate(found) : null;
    });
  };

  Model.create = async (data) => {
    const doc = new Model(data);
    await doc.validate();
    store.push(doc.toObject());
    return doc;
  };

  Model.deleteOne = async (filter = {}) => {
    const idx = store.findIndex((d) => matches(d, filter));
    if (idx !== -1) store.splice(idx, 1);
    return { deletedCount: idx !== -1 ? 1 : 0 };
  };

  Model.prototype.save = async function () {
    await this.validate();
    const plain = this.toObject();
    const idx = store.findIndex((d) => String(d._id) === String(plain._id));
    if (idx !== -1) store[idx] = plain;
    else store.push(plain);
    return this;
  };

  Model.prototype.populate = async function () {
    return this;
  };

  return { store, Model };
}

module.exports = { patchModel };
