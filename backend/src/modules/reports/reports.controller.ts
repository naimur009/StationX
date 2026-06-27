import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../../middleware/authenticate';
import { createError } from '../../middleware/errorHandler';
import * as reportsService from './reports.service';
import { REPORT_TYPES } from './reports.helper';
import type { ReportQueryDto, ExportQueryDto } from './reports.validation';

export async function handleGetReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type } = req.params;

    if (!type || !REPORT_TYPES.includes(type as typeof REPORT_TYPES[number])) {
      return next(createError(400, 'INVALID_REPORT_TYPE', `Unknown report type: ${type}. Valid types: ${REPORT_TYPES.join(', ')}`));
    }

    const query = req.query as unknown as ReportQueryDto;
    const result = await reportsService.getReport(type, query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function handleExportReport(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { type } = req.params;

    if (!type || !REPORT_TYPES.includes(type as typeof REPORT_TYPES[number])) {
      return next(createError(400, 'INVALID_REPORT_TYPE', `Unknown report type: ${type}. Valid types: ${REPORT_TYPES.join(', ')}`));
    }

    const query = req.query as unknown as ExportQueryDto;
    const pdfBuffer = await reportsService.exportReport(type, query);

    const now = new Date();
    const dateStr = now.toISOString().split('T')[0];
    const filename = `${type}-report-${dateStr}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.status(200).end(pdfBuffer);
  } catch (error) {
    next(error);
  }
}
