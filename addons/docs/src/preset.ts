import fs from 'fs-extra';
import remarkSlug from 'remark-slug';
import remarkExternalLinks from 'remark-external-links';
import global from 'global';

import type { DocsOptions, IndexerOptions, Options, StoryIndexer } from '@storybook/core-common';
import { logger } from '@storybook/node-logger';
import { loadCsf } from '@storybook/csf-tools';

// for frameworks that are not working with react, we need to configure
// the jsx to transpile mdx, for now there will be a flag for that
// for more complex solutions we can find alone that we need to add '@babel/plugin-transform-react-jsx'
type BabelParams = {
  babelOptions?: any;
  mdxBabelOptions?: any;
  configureJSX?: boolean;
};
function createBabelOptions({ babelOptions, mdxBabelOptions, configureJSX }: BabelParams) {
  const babelPlugins = mdxBabelOptions?.plugins || babelOptions?.plugins || [];
  const jsxPlugin = [
    require.resolve('@babel/plugin-transform-react-jsx'),
    { pragma: 'React.createElement', pragmaFrag: 'React.Fragment' },
  ];
  const plugins = configureJSX ? [...babelPlugins, jsxPlugin] : babelPlugins;
  return {
    // don't use the root babelrc by default (users can override this in mdxBabelOptions)
    babelrc: false,
    configFile: false,
    ...babelOptions,
    ...mdxBabelOptions,
    plugins,
  };
}

export async function webpack(
  webpackConfig: any = {},
  options: Options &
    BabelParams & { sourceLoaderOptions: any; transcludeMarkdown: boolean } /* & Parameters<
      typeof createCompiler
    >[0] */
) {
  const resolvedBabelLoader = require.resolve('babel-loader');

  const { module = {} } = webpackConfig;

  // it will reuse babel options that are already in use in storybook
  // also, these babel options are chained with other presets.
  const {
    babelOptions,
    mdxBabelOptions,
    configureJSX = true,
    sourceLoaderOptions = { injectStoryParameters: true },
    transcludeMarkdown = false,
  } = options;

  const mdxLoaderOptions = {
    // whether to skip storybook files, useful for docs only mdx or md files
    skipCsf: true,
    remarkPlugins: [remarkSlug, remarkExternalLinks],
  };

  const mdxVersion = global.FEATURES?.previewMdx2 ? 'MDX2' : 'MDX1';
  logger.info(`Addon-docs: using ${mdxVersion}`);

  const mdxLoader = global.FEATURES?.previewMdx2
    ? require.resolve('@storybook/mdx2-csf/loader')
    : require.resolve('@storybook/mdx1-csf/loader');

  let rules = module.rules || [];

  if (transcludeMarkdown) {
    rules = [
      ...rules.filter((rule: any) => rule.test?.toString() !== '/\\.md$/'),
      {
        test: /\.md$/,
        use: [
          {
            loader: resolvedBabelLoader,
            options: createBabelOptions({ babelOptions, mdxBabelOptions, configureJSX }),
          },
          {
            loader: mdxLoader,
            options: mdxLoaderOptions,
          },
        ],
      },
    ];
  }

  const result = {
    ...webpackConfig,
    module: {
      ...module,
      rules: [
        ...rules,
        Object.defineProperty(
          {
            test: /(stories|story)\.mdx$/,
            use: [
              {
                loader: resolvedBabelLoader,
                options: createBabelOptions({ babelOptions, mdxBabelOptions, configureJSX }),
              },
              {
                loader: mdxLoader,
                options: {
                  ...mdxLoaderOptions,
                  skipCsf: false,
                },
              },
            ],
          },
          'custom_id',
          {
            value: 'storybook_mdx',
            enumerable: false,
          }
        ),
        Object.defineProperty(
          {
            test: /\.mdx$/,
            exclude: /(stories|story)\.mdx$/,
            use: [
              {
                loader: resolvedBabelLoader,
                options: createBabelOptions({ babelOptions, mdxBabelOptions, configureJSX }),
              },
              {
                loader: mdxLoader,
                options: mdxLoaderOptions,
              },
            ],
          },
          'custom_id',
          {
            value: 'storybook_mdx',
            enumerable: false,
          }
        ),
        // set `sourceLoaderOptions` to `null` to disable for manual configuration
        ...(sourceLoaderOptions
          ? [
              Object.defineProperty(
                {
                  test: /\.(stories|story)\.[tj]sx?$/,
                  loader: require.resolve('@storybook/source-loader'),
                  options: { ...sourceLoaderOptions, inspectLocalDependencies: true },
                  enforce: 'pre',
                },
                'custom_id',
                { enumerable: false, value: 'storybook_source' }
              ),
            ]
          : []),
      ],
    },
  };

  return result;
}

export const storyIndexers = async (indexers: StoryIndexer[] | null) => {
  const mdxIndexer = async (fileName: string, opts: IndexerOptions) => {
    let code = (await fs.readFile(fileName, 'utf-8')).toString();
    // @ts-ignore
    const { compile } = global.FEATURES?.previewMdx2
      ? await import('@storybook/mdx2-csf')
      : await import('@storybook/mdx1-csf');
    code = await compile(code, {});
    return loadCsf(code, { ...opts, fileName }).parse();
  };
  return [
    {
      test: /(stories|story)\.mdx$/,
      indexer: mdxIndexer,
      addDocsTemplate: true,
    },
    ...(indexers || []),
  ];
};

export const docs = (docsOptions: DocsOptions) => {
  return {
    ...docsOptions,
    enabled: true,
    defaultName: 'Docs',
    docsPage: true,
  };
};
