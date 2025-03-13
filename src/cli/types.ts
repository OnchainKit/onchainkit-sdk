export interface FeatureFile {
  source: string;
  target: string;
}

export interface FeatureConfig {
  name: string;
  description: string;
  dependencies: string[];
  files: FeatureFile[];
}

export interface CliOptions {
  components?: boolean;
  utils?: boolean;
}