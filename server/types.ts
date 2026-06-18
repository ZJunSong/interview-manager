export const STAGE_NAMES = [
  '投递', '测评', '笔试', '简历评估', '一面',
  '二面', '三面', 'HR面', 'Offer评估', '正式offer'
] as const;

export type StageName = typeof STAGE_NAMES[number];

export type StageStatus = 'pending' | 'current' | 'pass' | 'fail' | 'rejected' | 'skip';

export interface Stage {
  name: StageName;
  status: StageStatus;
}

export interface Interview {
  id: string;
  company: string;
  position: string;
  stages: Stage[];
  createdAt: string;
  updatedAt: string;
}
