/**
 * Invoice Rule Engine
 * 프로젝트별 Billing Rule에 따라 실적 데이터를 그룹핑하고 Invoice Line을 자동 생성
 */

import ProjectBillingRule from '../models/ProjectBillingRule';
import Delivery, { IDelivery } from '../models/Delivery';
import LaborLog, { ILaborLog } from '../models/LaborLog';

export interface InvoiceLineData {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  amount: number;
  groupingKey?: string;
  groupingValue?: string;
  ruleId?: string;
  ruleType?: string;
  sourceData?: {
    sourceType: 'delivery' | 'labor' | 'pallet' | 'fixed' | 'other';
    sourceIds: string[];
    rawData?: Record<string, any>;
  };
}

export interface PerformanceData {
  deliveries: IDelivery[];
  laborLogs: ILaborLog[];
  // 향후 확장: pallets, containers 등
}

export class InvoiceRuleEngine {
  /**
   * 프로젝트의 활성화된 Billing Rule들을 가져옴
   */
  static async getActiveRules(projectId: string): Promise<any[]> {
    const rules = await ProjectBillingRule.find({
      project: projectId,
      isActive: true,
    }).sort({ priority: -1 });

    return rules;
  }

  /**
   * 특정 기간의 실적 데이터를 가져옴
   */
  static async getPerformanceData(
    projectId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<PerformanceData> {
    const deliveries = await Delivery.find({
      project: projectId,
      invoiced: { $ne: true },
      deliveryDate: { $gte: periodStart, $lte: periodEnd },
    });

    const laborLogs = await LaborLog.find({
      project: projectId,
      invoiced: { $ne: true },
      workDate: { $gte: periodStart, $lte: periodEnd },
    });

    return { deliveries, laborLogs };
  }

  /**
   * Rule에 따라 Invoice Line들을 생성
   */
  static generateInvoiceLines(
    rule: any,
    performanceData: PerformanceData
  ): InvoiceLineData[] {
    switch (rule.ruleType) {
      case 'EA':
        return this.generateEALines(rule, performanceData);
      case 'PALLET':
        return this.generatePalletLines(rule, performanceData);
      case 'LABOR':
        return this.generateLaborLines(rule, performanceData);
      case 'FIXED':
        return this.generateFixedLines(rule, performanceData);
      case 'MIXED':
        return this.generateMixedLines(rule, performanceData);
      default:
        return [];
    }
  }

  /**
   * EA 기준 라인 생성 (부품별 EA × 단가)
   */
  private static generateEALines(
    rule: any,
    data: PerformanceData
  ): InvoiceLineData[] {
    const lines: InvoiceLineData[] = [];
    const deliveries = data.deliveries.filter((d: IDelivery) => d.partNo);

    if (deliveries.length === 0) return lines;

    // 그룹핑
    const grouped = this.groupBy(deliveries, rule.groupingKey, rule.config?.groupBy);

    for (const [key, items] of Object.entries(grouped)) {
      const totalQty = items.reduce((sum: number, item: IDelivery) => sum + (item.quantity || 0), 0);

      // 단가 가져오기
      const unitPrice = this.getUnitPrice(rule, items[0]);

      if (totalQty > 0 && unitPrice > 0) {
        lines.push({
          description: this.generateDescription(rule, items[0], key),
          quantity: totalQty,
          unit: 'EA',
          unitPrice,
          amount: totalQty * unitPrice,
          groupingKey: rule.groupingKey,
          groupingValue: key,
          ruleId: rule._id?.toString(),
          ruleType: rule.ruleType,
          sourceData: {
            sourceType: 'delivery',
            sourceIds: items.map((item: IDelivery) => item._id?.toString() || ''),
            rawData: { partNo: items[0].partNo, partName: items[0].partName },
          },
        });
      }
    }

    return lines;
  }

  /**
   * 팔레트 기준 라인 생성
   */
  private static generatePalletLines(
    rule: any,
    data: PerformanceData
  ): InvoiceLineData[] {
    const lines: InvoiceLineData[] = [];
    const deliveries = data.deliveries.filter((d: IDelivery) => d.palletNo || d.palletCount);

    if (deliveries.length === 0) return lines;

    // 팔레트별로 그룹핑
    const grouped = this.groupBy(deliveries, rule.groupingKey, rule.config?.groupBy);

    for (const [key, items] of Object.entries(grouped)) {
      // 팔레트 수량 계산
      let palletCount = 0;
      if (rule.groupingKey === 'pallet_no') {
        palletCount = items.length; // 팔레트 번호별 개수
      } else {
        palletCount = items.reduce((sum: number, item: IDelivery) =>
          sum + (item.palletCount || 1), 0
        );
      }

      // 팔레트 단가 가져오기
      const unitPrice = this.getUnitPrice(rule, items[0]);

      if (palletCount > 0 && unitPrice > 0) {
        lines.push({
          description: this.generateDescription(rule, items[0], key),
          quantity: palletCount,
          unit: 'Pallet',
          unitPrice,
          amount: palletCount * unitPrice,
          groupingKey: rule.groupingKey,
          groupingValue: key,
          ruleId: rule._id?.toString(),
          ruleType: rule.ruleType,
          sourceData: {
            sourceType: 'pallet',
            sourceIds: items.map((item: IDelivery) => item._id?.toString() || ''),
            rawData: { palletType: items[0].palletType },
          },
        });
      }
    }

    return lines;
  }

  /**
   * 노무 기준 라인 생성 (시간 × 시간당 단가)
   */
  private static generateLaborLines(
    rule: any,
    data: PerformanceData
  ): InvoiceLineData[] {
    const lines: InvoiceLineData[] = [];
    const laborLogs = data.laborLogs;

    if (laborLogs.length === 0) return lines;

    // 작업 유형별로 그룹핑
    const grouped = this.groupBy(laborLogs, rule.groupingKey, rule.config?.groupBy);

    for (const [key, items] of Object.entries(grouped)) {
      const totalHours = items.reduce((sum: number, item: ILaborLog) =>
        sum + (item.hours || 0), 0
      );

      // 노무 단가 가져오기
      const unitPrice = this.getLaborRate(rule, items[0]);

      if (totalHours > 0 && unitPrice > 0) {
        lines.push({
          description: this.generateDescription(rule, items[0], key),
          quantity: totalHours,
          unit: 'Hour',
          unitPrice,
          amount: totalHours * unitPrice,
          groupingKey: rule.groupingKey,
          groupingValue: key,
          ruleId: rule._id?.toString(),
          ruleType: rule.ruleType,
          sourceData: {
            sourceType: 'labor',
            sourceIds: items.map((item: ILaborLog) => item._id?.toString() || ''),
            rawData: { workType: items[0].workType },
          },
        });
      }
    }

    return lines;
  }

  /**
   * 고정 월비 라인 생성
   */
  private static generateFixedLines(
    rule: any,
    data: PerformanceData
  ): InvoiceLineData[] {
    const unitPrice = rule.config?.unitPrice || 0;

    if (unitPrice <= 0) return [];

    return [{
      description: rule.description || rule.ruleName,
      quantity: 1,
      unit: 'Month',
      unitPrice,
      amount: unitPrice,
      groupingKey: 'none',
      ruleId: rule._id?.toString(),
      ruleType: rule.ruleType,
      sourceData: {
        sourceType: 'fixed',
        sourceIds: [],
      },
    }];
  }

  /**
   * 복합 타입 라인 생성 (여러 규칙 조합)
   */
  private static generateMixedLines(
    rule: any,
    data: PerformanceData
  ): InvoiceLineData[] {
    // MIXED 타입은 여러 하위 규칙을 가질 수 있음
    // 여기서는 간단히 여러 타입을 조합
    const lines: InvoiceLineData[] = [];

    // EA 라인 추가
    const eaLines = this.generateEALines(rule, data);
    lines.push(...eaLines);

    // Labor 라인 추가
    const laborLines = this.generateLaborLines(rule, data);
    lines.push(...laborLines);

    // Pallet 라인 추가
    const palletLines = this.generatePalletLines(rule, data);
    lines.push(...palletLines);

    return lines;
  }

  /**
   * 데이터 그룹핑
   */
  private static groupBy(
    items: any[],
    groupingKey: string,
    groupByFields?: string[]
  ): Record<string, any[]> {
    const grouped: Record<string, any[]> = {};

    for (const item of items) {
      let key: string;

      if (groupByFields && groupByFields.length > 0) {
        // 여러 필드로 그룹핑
        key = groupByFields.map(field => item[field] || '').join('|');
      } else {
        // 단일 필드로 그룹핑
        switch (groupingKey) {
          case 'part_no':
            key = item.partNo || 'UNKNOWN';
            break;
          case 'pallet_no':
            key = item.palletNo || 'UNKNOWN';
            break;
          case 'date':
            // eslint-disable-next-line no-case-declarations
            const dateVal = item.deliveryDate || item.workDate;
            key = dateVal ? new Date(dateVal).toISOString().split('T')[0] : 'UNKNOWN';
            break;
          case 'work_type':
            key = item.workType || 'UNKNOWN';
            break;
          default:
            key = 'ALL';
        }
      }

      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    return grouped;
  }

  /**
   * 단가 가져오기
   */
  private static getUnitPrice(rule: any, item: any): number {
    switch (rule.priceSource) {
      case 'fixed_price':
        return rule.config?.unitPrice || 0;
      case 'price_list':
        // 가격표에서 가져오기 (향후 구현)
        // const priceList = getPriceList(rule.config.priceListId);
        // return priceList[item.partNo] || 0;
        return rule.config?.unitPrice || 0;
      case 'contract_rate':
        return rule.config?.unitPrice || 0;
      default:
        return 0;
    }
  }

  /**
   * 노무 단가 가져오기
   */
  private static getLaborRate(rule: any, item: any): number {
    if (item.laborRate) {
      return item.laborRate;
    }
    return rule.config?.unitPrice || 0;
  }

  /**
   * 라인 설명 생성
   */
  private static generateDescription(
    rule: any,
    item: any,
    groupingValue: string
  ): string {
    if (rule.ruleType === 'FIXED') {
      return rule.description || rule.ruleName;
    }

    if (rule.ruleType === 'EA') {
      return `${item.partName || item.partNo || 'Part'} - ${groupingValue}`;
    }

    if (rule.ruleType === 'PALLET') {
      return `${item.palletType || 'Pallet'} - ${groupingValue}`;
    }

    if (rule.ruleType === 'LABOR') {
      return `Labor – ${item.workType || 'Work'} - ${groupingValue}`;
    }

    return rule.description || rule.ruleName;
  }

  /**
   * 모든 활성 규칙에 대해 Invoice Line 생성
   */
  static async generateAllInvoiceLines(
    projectId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<InvoiceLineData[]> {
    const rules = await this.getActiveRules(projectId);
    const performanceData = await this.getPerformanceData(projectId, periodStart, periodEnd);
    const allLines: InvoiceLineData[] = [];

    for (const rule of rules) {
      const lines = this.generateInvoiceLines(rule, performanceData);
      allLines.push(...lines);
    }

    return allLines;
  }
}
