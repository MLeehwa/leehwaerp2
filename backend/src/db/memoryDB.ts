// 메모리 기반 데이터베이스
class MemoryDB {
  private data: Map<string, any[]> = new Map();

  constructor() {
    // 초기 데이터 로드
    this.loadInitialData();
  }

  private loadInitialData() {
    // 기본 관리자 계정 (비밀번호: admin123)
    // 실제 해시는 서버 시작 시 생성됨
    this.data.set('users', []);

    // 기본 카테고리
    this.data.set('categories', [
      { _id: '1', code: 'PURCHASE', name: '일반 구매', type: 'purchase', description: '일반적인 구매 항목', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: '2', code: 'LOGISTICS', name: '물류비', type: 'logistics', description: '운송 및 물류 관련 비용', isActive: true, createdAt: new Date(), updatedAt: new Date() },
      { _id: '3', code: 'EXPENSE', name: '경비', type: 'expense', description: '기타 경비 항목', isActive: true, createdAt: new Date(), updatedAt: new Date() },
    ]);

    // 빈 컬렉션 초기화
    this.data.set('products', []);
    this.data.set('customers', []);
    this.data.set('suppliers', []);
    this.data.set('purchaseRequests', []);
    this.data.set('purchaseOrders', []);
    this.data.set('accountsPayable', []);
    this.data.set('shippingAddresses', []);
    
    // Invoice 관련 컬렉션
    this.data.set('projects', []);
    this.data.set('projectBillingRules', []);
    this.data.set('invoices', []);
    this.data.set('invoiceItems', []);
    this.data.set('deliveries', []);
    this.data.set('laborLogs', []);
    this.data.set('projectSourceFiles', []);
    this.data.set('projectMonthlyClosings', []);
    this.data.set('accountsReceivable', []);
  }

  // 컬렉션 가져오기
  getCollection(name: string): any[] {
    if (!this.data.has(name)) {
      this.data.set(name, []);
    }
    return this.data.get(name)!;
  }

  // ID 생성
  generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 찾기
  find(collection: string, query: any = {}): any[] {
    const items = this.getCollection(collection);
    if (Object.keys(query).length === 0) {
      return [...items];
    }

    return items.filter((item) => {
      return Object.keys(query).every((key) => {
        if (key === '_id' || key.endsWith('Id')) {
          return String(item[key]) === String(query[key]);
        }
        return item[key] === query[key];
      });
    });
  }

  // 하나 찾기
  findOne(collection: string, query: any): any | null {
    const results = this.find(collection, query);
    return results.length > 0 ? { ...results[0] } : null;
  }

  // ID로 찾기
  findById(collection: string, id: string): any | null {
    return this.findOne(collection, { _id: id });
  }

  // 생성
  create(collection: string, data: any): any {
    const items = this.getCollection(collection);
    const newItem = {
      ...data,
      _id: data._id || this.generateId(),
      createdAt: data.createdAt || new Date(),
      updatedAt: data.updatedAt || new Date(),
    };
    items.push(newItem);
    return { ...newItem };
  }

  // 업데이트
  update(collection: string, id: string, data: any): any | null {
    const items = this.getCollection(collection);
    const index = items.findIndex((item) => String(item._id) === String(id));
    if (index === -1) return null;

    items[index] = {
      ...items[index],
      ...data,
      _id: items[index]._id,
      updatedAt: new Date(),
    };
    return { ...items[index] };
  }

  // 삭제
  delete(collection: string, id: string): boolean {
    const items = this.getCollection(collection);
    const index = items.findIndex((item) => String(item._id) === String(id));
    if (index === -1) return false;
    items.splice(index, 1);
    return true;
  }

  // 카운트
  count(collection: string, query: any = {}): number {
    return this.find(collection, query).length;
  }

  // 집계 (간단한 버전)
  aggregate(collection: string, pipeline: any[]): any[] {
    let results = [...this.getCollection(collection)];

    for (const stage of pipeline) {
      if (stage.$match) {
        results = results.filter((item) => {
          return Object.keys(stage.$match).every((key) => {
            const condition = stage.$match[key];
            if (typeof condition === 'object' && condition.$gte) {
              return new Date(item[key]) >= new Date(condition.$gte);
            }
            if (typeof condition === 'object' && condition.$lte) {
              return new Date(item[key]) <= new Date(condition.$lte);
            }
            if (typeof condition === 'object' && condition.$lt) {
              return new Date(item[key]) < new Date(condition.$lt);
            }
            if (typeof condition === 'object' && condition.$ne) {
              return item[key] !== condition.$ne;
            }
            return item[key] === condition;
          });
        });
      }

      if (stage.$group) {
        const grouped: any = {};
        results.forEach((item) => {
          const groupKey = stage.$group._id || 'all';
          if (!grouped[groupKey]) {
            grouped[groupKey] = { _id: groupKey };
            Object.keys(stage.$group).forEach((key) => {
              if (key !== '_id') {
                const op = stage.$group[key];
                if (op.$sum) {
                  grouped[groupKey][key] = 0;
                } else if (op.$cond) {
                  grouped[groupKey][key] = 0;
                }
              }
            });
          }
          Object.keys(stage.$group).forEach((key) => {
            if (key !== '_id') {
              const op = stage.$group[key];
              if (op.$sum === 1) {
                grouped[groupKey][key] = (grouped[groupKey][key] || 0) + 1;
              } else if (op.$sum && typeof op.$sum === 'string') {
                const field = op.$sum.replace('$', '');
                grouped[groupKey][key] = (grouped[groupKey][key] || 0) + (item[field] || 0);
              } else if (op.$cond) {
                const condition = op.$cond[0];
                const thenVal = op.$cond[1];
                const elseVal = op.$cond[2];
                if (this.evaluateCondition(item, condition)) {
                  grouped[groupKey][key] = (grouped[groupKey][key] || 0) + thenVal;
                } else {
                  grouped[groupKey][key] = (grouped[groupKey][key] || 0) + elseVal;
                }
              }
            }
          });
        });
        results = Object.values(grouped);
      }

      if (stage.$unwind) {
        const field = stage.$unwind.replace('$', '');
        const newResults: any[] = [];
        results.forEach((item) => {
          if (Array.isArray(item[field])) {
            item[field].forEach((subItem: any) => {
              newResults.push({ ...item, [field]: subItem });
            });
          }
        });
        results = newResults;
      }

      if (stage.$sort) {
        const sortKey = Object.keys(stage.$sort)[0];
        const sortOrder = stage.$sort[sortKey];
        results.sort((a, b) => {
          if (sortOrder === 1) {
            return a[sortKey] > b[sortKey] ? 1 : -1;
          } else {
            return a[sortKey] < b[sortKey] ? 1 : -1;
          }
        });
      }
    }

    return results;
  }

  private evaluateCondition(item: any, condition: any): boolean {
    if (condition.$and) {
      return condition.$and.every((c: any) => this.evaluateCondition(item, c));
    }
    if (condition.$eq) {
      return item[Object.keys(condition.$eq)[0]] === condition.$eq[Object.keys(condition.$eq)[0]];
    }
    if (condition.$lt) {
      const key = Object.keys(condition.$lt)[0];
      return new Date(item[key]) < new Date(condition.$lt[key]);
    }
    if (condition.$ne) {
      const key = Object.keys(condition.$ne)[0];
      return item[key] !== condition.$ne[key];
    }
    return false;
  }
}

export const db = new MemoryDB();

