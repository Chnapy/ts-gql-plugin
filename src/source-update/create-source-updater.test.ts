/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/consistent-function-scoping */
import { join } from 'node:path';
import { Logger } from '../utils/logger';
import { createSourceUpdater as _createSourceUpdater } from './create-source-updater';
import { createSourceFile, formatTS } from '../utils/test-utils';
import { PluginConfig } from '../plugin-config';
import { ErrorCatcher } from '../create-error-catcher';
import { createCachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import { createCachedLiteralParser } from '../cached/cached-literal-parser';

const resolveTestFile = (path: string) => join('src/test-files', path);

const singleProjectPath = resolveTestFile('single-project/.graphqlrc');
const multiProjectPath = resolveTestFile('multi-project/.graphqlrc');
const codegenConfigPath = resolveTestFile('codegen-config/.graphqlrc');

describe('Create source updater', () => {
  const createFakeLogger = (): Logger => ({
    log: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
    debugTime: vi.fn(),
    debugToFile: vi.fn(),
    setFilename: vi.fn(),
  });

  const createSourceUpdater = (
    config: PluginConfig,
    errorCatcher: ErrorCatcher,
    logger: Logger = createFakeLogger()
  ) => {
    const cachedGraphQLConfigLoader = createCachedGraphQLConfigLoader({
      directory: '',
      graphqlConfigPath: config.graphqlConfigPath,
      projectNameRegex: config.projectNameRegex,
      logger,
    });

    const cachedDocumentSchemaLoader = createCachedDocumentSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });

    const cachedLiteralParser = createCachedLiteralParser({
      cachedDocumentSchemaLoader,
      projectNameRegex: config.projectNameRegex,
      errorCatcher,
    });

    return _createSourceUpdater(
      cachedDocumentSchemaLoader,
      cachedLiteralParser,
      logger,
      errorCatcher
    );
  };

  it('gives noop function on any error', async () => {
    const logger = createFakeLogger();

    const errorCatcher = vi.fn(() => null);

    const updateScriptSnapshot = _createSourceUpdater(
      null as any,
      null as any,
      logger,
      errorCatcher
    );

    const query1 = `gql(\`
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
    \`)`;

    const query2 = `gql(\`
  query Toto($id: ID!) {
    toto(id: $id) {
      id
      email
    }
  }
  \`)`;

    const snapshot = `
      import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
      
      export const CartList: React.FC = () => {
        const { t } = useTranslate();
        const { data: cartData, loading } = useQuery(${query1});
        const { data: totoData } = useQuery(${query2});
        const cartItems = useGraphQLArray(cartData?.cartItems);
        const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
        const cartPrice = useCartPrice();
      
        return (
          <div>
            {removedVendorProductId && (
              <VendorProductContextProvider value={removedVendorProductId}>
                <ProductFromVendorProductContextProvider>
                  <CartItemRemoved />
                </ProductFromVendorProductContextProvider>
              </VendorProductContextProvider>
            )}
            {loading ? <Spinner /> : <div>foo</div>}
            <BottomText />
          </div>
        );
      };
      
      export default CartList;
    `;

    expect(await updateScriptSnapshot(createSourceFile(snapshot))).toBe(
      snapshot
    );

    expect(errorCatcher).toHaveBeenCalled();
  });

  it('gives noop function if schema not defined', async () => {
    const errorCatcher = vi.fn(() => null);

    const updateScriptSnapshot = createSourceUpdater({}, errorCatcher);

    expect(await updateScriptSnapshot(createSourceFile(''))).toBe('');
  });

  it('gives same source if no occurrence found', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createSourceUpdater(
      { graphqlConfigPath: singleProjectPath },
      (err) => {
        throw err;
      },
      logger
    );

    const source = `
      import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
      
      export const CartList: React.FC = () => {
        const { t } = useTranslate();
        const cartItems = useGraphQLArray(cartData?.cartItems);
        const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
        const cartPrice = useCartPrice();
      
        return (
          <div>
            {removedVendorProductId && (
              <VendorProductContextProvider value={removedVendorProductId}>
                <ProductFromVendorProductContextProvider>
                  <CartItemRemoved />
                </ProductFromVendorProductContextProvider>
              </VendorProductContextProvider>
            )}
            {loading ? <Spinner /> : <div>foo</div>}
            <BottomText />
          </div>
        );
      };
      
      export default CartList;
    `;

    const result = await updateScriptSnapshot(createSourceFile(source));

    expect(logger.error).not.toHaveBeenCalled();

    expect(result).toBe(source);
  });

  it('gives updated source', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createSourceUpdater(
      { graphqlConfigPath: singleProjectPath },
      (err) => {
        throw err;
      },
      logger
    );

    const query1 = `gql(\`
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
    \`)`;

    const query2 = `gql(\`
  query Toto($id: ID!) {
    toto(id: $id) {
      id
      email
    }
  }
  \`)`;

    const snapshot = `
      import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
      
      export const CartList: React.FC = () => {
        const { t } = useTranslate();
        const { data: cartData, loading } = useQuery(${query1});
        const { data: totoData } = useQuery(${query2});
        const cartItems = useGraphQLArray(cartData?.cartItems);
        const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
        const cartPrice = useCartPrice();
      
        return (
          <div>
            {removedVendorProductId && (
              <VendorProductContextProvider value={removedVendorProductId}>
                <ProductFromVendorProductContextProvider>
                  <CartItemRemoved />
                </ProductFromVendorProductContextProvider>
              </VendorProductContextProvider>
            )}
            {loading ? <Spinner /> : <div>foo</div>}
            <BottomText />
          </div>
        );
      };
      
      export default CartList;
    `;

    const result = await updateScriptSnapshot(createSourceFile(snapshot));

    expect(logger.error).not.toHaveBeenCalled();

    expect(formatTS(result)).toEqual(
      formatTS(`
    import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
    
    export const CartList: React.FC = () => {
      const { t } = useTranslate();
      const { data: cartData, loading } = useQuery(${query1});
      const { data: totoData } = useQuery(${query2});
      const cartItems = useGraphQLArray(cartData?.cartItems);
      const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
      const cartPrice = useCartPrice();
    
      return (
        <div>
          {removedVendorProductId && (
            <VendorProductContextProvider value={removedVendorProductId}>
              <ProductFromVendorProductContextProvider>
                <CartItemRemoved />
              </ProductFromVendorProductContextProvider>
            </VendorProductContextProvider>
          )}
          {loading ? <Spinner /> : <div>foo</div>}
          <BottomText />
        </div>
      );
    };
    
    export default CartList;

    /* eslint-disable */

      module TsGql {
        type DocumentNode = import('graphql').DocumentNode;

        export interface TypedDocumentNode<
          Result = { [key: string]: unknown },
          Variables = { [key: string]: unknown }
        > extends DocumentNode {
          /**
           * This type is used to ensure that the variables you pass in to the query are assignable to Variables
           * and that the Result is assignable to whatever you pass your result to. The method is never actually
           * implemented, but the type is valid because we list it as optional
           */
          __apiType?: (variables: Variables) => Result;
        }

        export interface DocumentMap {
          [${query1.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            user: { __typename?: "User"; id: string; name: string };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          }, Exact<{
            id: Scalars["ID"];
          }>>;
          [${query2.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            toto: { __typename?: "User"; id: string; email: string };
          }, Exact<{
            id: Scalars["ID"];
          }>>;
        }

        export type Maybe<T> = T | null;
        export type InputMaybe<T> = Maybe<T>;
        export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };

        /** All built-in and custom scalars, mapped to their actual values */
        export interface Scalars {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
        };
        
        export interface User {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
        };
    
        export interface Query {
           __typename?: "Query";
           users: Array<User>;
           user: User;
           toto: User;
         };
         
         export interface QueryUserArgs {
           id: Scalars["ID"];
         };
         
         export interface QueryTotoArgs {
            id: Scalars["ID"];
          };
      }

    declare module 'graphql-tag' {
      export function gql<Literal extends keyof TsGql.DocumentMap>(
        literals: Literal
      ): TsGql.DocumentMap[Literal];
    }
  `)
    );
  });

  it('gives updated source on multi-projects config', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createSourceUpdater(
      {
        graphqlConfigPath: multiProjectPath,
        projectNameRegex: '([A-Z][a-z]*)',
      },
      (err) => {
        throw err;
      },
      logger
    );

    const query1 = `gql(\`
    query CatalogUser($id: ID!) {
      user(id: $id) {
        id
        name
        provider
      }
      users {
        id
        email
      }
    }
    \`)`;

    const query2 = `gql(\`
  query ChannelToto($id: ID!) {
    toto(id: $id) {
      id
      value
    }
  }
  \`)`;

    const snapshot = `
      import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
      
      export const CartList: React.FC = () => {
        const { t } = useTranslate();
        const { data: cartData, loading } = useQuery(${query1});
        const { data: totoData } = useQuery(${query2});
        const cartItems = useGraphQLArray(cartData?.cartItems);
        const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
        const cartPrice = useCartPrice();
      
        return (
          <div>
            {removedVendorProductId && (
              <VendorProductContextProvider value={removedVendorProductId}>
                <ProductFromVendorProductContextProvider>
                  <CartItemRemoved />
                </ProductFromVendorProductContextProvider>
              </VendorProductContextProvider>
            )}
            {loading ? <Spinner /> : <div>foo</div>}
            <BottomText />
          </div>
        );
      };
      
      export default CartList;
    `;

    const result = await updateScriptSnapshot(createSourceFile(snapshot));

    expect(logger.error).not.toHaveBeenCalled();

    expect(formatTS(result)).toEqual(
      formatTS(`
    import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
    
    export const CartList: React.FC = () => {
      const { t } = useTranslate();
      const { data: cartData, loading } = useQuery(${query1});
      const { data: totoData } = useQuery(${query2});
      const cartItems = useGraphQLArray(cartData?.cartItems);
      const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
      const cartPrice = useCartPrice();
    
      return (
        <div>
          {removedVendorProductId && (
            <VendorProductContextProvider value={removedVendorProductId}>
              <ProductFromVendorProductContextProvider>
                <CartItemRemoved />
              </ProductFromVendorProductContextProvider>
            </VendorProductContextProvider>
          )}
          {loading ? <Spinner /> : <div>foo</div>}
          <BottomText />
        </div>
      );
    };
    
    export default CartList;

    /* eslint-disable */

      module TsGql {
        type DocumentNode = import('graphql').DocumentNode;

        export interface TypedDocumentNode<
          Result = { [key: string]: unknown },
          Variables = { [key: string]: unknown }
        > extends DocumentNode {
          /**
           * This type is used to ensure that the variables you pass in to the query are assignable to Variables
           * and that the Result is assignable to whatever you pass your result to. The method is never actually
           * implemented, but the type is valid because we list it as optional
           */
          __apiType?: (variables: Variables) => Result;
        }

        export interface DocumentMap {
          [${query1.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            user: { 
              __typename?: "User"; 
              id: string; 
              name: string;
              provider?: CatalogProvider | null;
            };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          }, Exact<{
            id: Scalars["ID"];
          }>>;
          [${query2.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            toto: { __typename?: "Item"; id: string; value: string };
          }, Exact<{
            id: Scalars["ID"];
          }>>;
        }

        export type Maybe<T> = T | null;
        export type InputMaybe<T> = Maybe<T>;
        export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };

        /** All built-in and custom scalars, mapped to their actual values */
        export interface Scalars {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
        };
        
        export interface CatalogUser {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
          provider?: Maybe<CatalogProvider>;
        };
    
        export interface CatalogQuery {
           __typename?: "Query";
           users: Array<CatalogUser>;
           user: CatalogUser;
         };
         
         export interface CatalogQueryUserArgs {
           id: Scalars["ID"];
         };

         export type CatalogProvider = "GOOGLE" | "FACEBOOK";

         /** All built-in and custom scalars, mapped to their actual values */
         export interface Scalars {
           ID: string;
           String: string;
           Boolean: boolean;
           Int: number;
           Float: number;
         };

         export interface ChannelItem {
           __typename?: "Item";
           id: Scalars["ID"];
           value: Scalars["String"];
         };
        
         export interface ChannelQuery {
           __typename?: "Query";
           toto: ChannelItem;
         };
         
         export interface ChannelQueryTotoArgs {
            id: Scalars["ID"];
          };
      }

    declare module 'graphql-tag' {
      export function gql<Literal extends keyof TsGql.DocumentMap>(
        literals: Literal
      ): TsGql.DocumentMap[Literal];
    }
  `)
    );
  });

  it('gives updated source with codegen config', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createSourceUpdater(
      { graphqlConfigPath: codegenConfigPath },
      (err) => {
        throw err;
      },
      logger
    );

    const query1 = `gql(\`
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
    \`)`;

    const query2 = `gql(\`
  query Toto($id: ID!) {
    toto(id: $id) {
      id
      email
    }
  }
  \`)`;

    const snapshot = `
      import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
      
      export const CartList: React.FC = () => {
        const { t } = useTranslate();
        const { data: cartData, loading } = useQuery(${query1});
        const { data: totoData } = useQuery(${query2});
        const cartItems = useGraphQLArray(cartData?.cartItems);
        const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
        const cartPrice = useCartPrice();
      
        return (
          <div>
            {removedVendorProductId && (
              <VendorProductContextProvider value={removedVendorProductId}>
                <ProductFromVendorProductContextProvider>
                  <CartItemRemoved />
                </ProductFromVendorProductContextProvider>
              </VendorProductContextProvider>
            )}
            {loading ? <Spinner /> : <div>foo</div>}
            <BottomText />
          </div>
        );
      };
      
      export default CartList;
    `;

    const result = await updateScriptSnapshot(createSourceFile(snapshot));

    expect(logger.error).not.toHaveBeenCalled();

    expect(formatTS(result)).toEqual(
      formatTS(`
    import { useCartPrice } from 'web-client/components/organisms/cart/hooks/UseCartPrice';
    
    export const CartList: React.FC = () => {
      const { t } = useTranslate();
      const { data: cartData, loading } = useQuery(${query1});
      const { data: totoData } = useQuery(${query2});
      const cartItems = useGraphQLArray(cartData?.cartItems);
      const [removedVendorProductId, setRemovedVendorProductId] = React.useState<string | null>(null);
      const cartPrice = useCartPrice();
    
      return (
        <div>
          {removedVendorProductId && (
            <VendorProductContextProvider value={removedVendorProductId}>
              <ProductFromVendorProductContextProvider>
                <CartItemRemoved />
              </ProductFromVendorProductContextProvider>
            </VendorProductContextProvider>
          )}
          {loading ? <Spinner /> : <div>foo</div>}
          <BottomText />
        </div>
      );
    };
    
    export default CartList;

    /* eslint-disable */

      module TsGql {
        type DocumentNode = import('graphql').DocumentNode;

        export interface TypedDocumentNode<
          Result = { [key: string]: unknown },
          Variables = { [key: string]: unknown }
        > extends DocumentNode {
          /**
           * This type is used to ensure that the variables you pass in to the query are assignable to Variables
           * and that the Result is assignable to whatever you pass your result to. The method is never actually
           * implemented, but the type is valid because we list it as optional
           */
          __apiType?: (variables: Variables) => Result;
        }

        export interface DocumentMap {
          [${query1.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            user: { __typename?: "User"; id: string; name: string };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          }, Exact<{
            id: Scalars["ID"];
          }>>;
          [${query2.slice(4, -1)}]: TypedDocumentNode<{
            __typename?: "Query";
            toto: { __typename?: "User"; id: string; email: string };
          }, Exact<{
            id: Scalars["ID"];
          }>>;
        }

        export type Maybe<T> = T | null;
        export type InputMaybe<T> = Maybe<T>;
        export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        export type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };

        /** All built-in and custom scalars, mapped to their actual values */
        export interface Scalars {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
          DateTime: String;
        };
        
        export interface User {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
          createdAt?: Maybe<Scalars["DateTime"]>;
        };
    
        export interface Query {
           __typename?: "Query";
           users: Array<User>;
           user: User;
           toto: User;
         };
         
         export interface QueryUserArgs {
           id: Scalars["ID"];
         };
         
         export interface QueryTotoArgs {
            id: Scalars["ID"];
          };
      }

    declare module 'graphql-tag' {
      export function gql<Literal extends keyof TsGql.DocumentMap>(
        literals: Literal
      ): TsGql.DocumentMap[Literal];
    }
  `)
    );
  });
});
