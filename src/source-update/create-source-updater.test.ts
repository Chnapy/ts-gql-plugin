/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/consistent-function-scoping */
import * as createUniqueStringExport from '../utils/create-unique-string';
import { Logger } from '../utils/logger';
import { createSourceUpdater } from './create-source-updater';
import { formatTS } from './test-utils';
import { join } from 'node:path';

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
    setFilename: vi.fn(),
  });

  it('gives noop function on any error', async () => {
    const logger = createFakeLogger();

    const errorCatcher = vi.fn(() => null);

    const updateScriptSnapshot = createSourceUpdater(
      null as any,
      null as any,
      logger,
      errorCatcher
    );

    expect(errorCatcher).toHaveBeenCalled();

    expect(await updateScriptSnapshot('', '')).toBe('');
  });

  it('gives noop function if schema not defined', async () => {
    const logger = createFakeLogger();

    const errorCatcher = vi.fn(() => null);

    const updateScriptSnapshot = createSourceUpdater(
      '',
      {},
      logger,
      errorCatcher
    );

    expect(await updateScriptSnapshot('', '')).toBe('');
  });

  it('gives same source if no occurrence found', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createSourceUpdater(
      '',
      { graphqlConfigPath: singleProjectPath },
      logger,
      (err) => {
        throw err;
      }
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

    const result = await updateScriptSnapshot('', source);

    expect(logger.error).not.toHaveBeenCalled();

    expect(result).toBe(source);
  });

  it('gives updated source', async () => {
    const logger = createFakeLogger();

    const createUniqueStringSpy = vi.spyOn(
      createUniqueStringExport,
      'createUniqueString'
    );
    createUniqueStringSpy.mockImplementationOnce(() => '_unique_module_name');

    const updateScriptSnapshot = createSourceUpdater(
      '',
      { graphqlConfigPath: singleProjectPath },
      logger,
      (err) => {
        throw err;
      }
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

    const result = await updateScriptSnapshot('', snapshot);

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

    declare module 'graphql-tag' {
      module _unique_module_name {
        type DocumentNode = import('graphql').DocumentNode;

        interface TypedDocumentNode<
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

        interface DocumentMap {
          [${query1.slice(
            4,
            -1
          )}]: TypedDocumentNode<UserQueryOperation, UserQueryVariables>;
          [${query2.slice(
            4,
            -1
          )}]: TypedDocumentNode<TotoQueryOperation, TotoQueryVariables>;
        }

        type Maybe<T> = T | null;
        type InputMaybe<T> = Maybe<T>;
        type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };
        /** All built-in and custom scalars, mapped to their actual values */
        type Scalars = {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
        };
        
        type User = {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
        };
    
        type Query = {
           __typename?: "Query";
           users: Array<User>;
           user: User;
           toto: User;
         };
         
         type QueryUserArgs = {
           id: Scalars["ID"];
         };
         
          type QueryTotoArgs = {
            id: Scalars["ID"];
          };
    
          type UserQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type UserQueryOperation = {
            __typename?: "Query";
            user: { __typename?: "User"; id: string; name: string };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          };
    
          type TotoQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type TotoQueryOperation = {
            __typename?: "Query";
            toto: { __typename?: "User"; id: string; email: string };
          };
      }

      export function gql<Literal extends keyof _unique_module_name.DocumentMap>(
        literals: Literal | readonly string[],
        ...args: any[]
      ): _unique_module_name.DocumentMap[Literal];
    }
  `)
    );
  });

  it('gives updated source on multi-projects config', async () => {
    const logger = createFakeLogger();

    const createUniqueStringSpy = vi.spyOn(
      createUniqueStringExport,
      'createUniqueString'
    );
    createUniqueStringSpy.mockImplementationOnce(() => '_unique_module_name');

    const updateScriptSnapshot = createSourceUpdater(
      '',
      {
        graphqlConfigPath: multiProjectPath,
        projectNameRegex: '([A-Z][a-z]*)',
      },
      logger,
      (err) => {
        throw err;
      }
    );

    const query1 = `gql(\`
    query CatalogUser($id: ID!) {
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

    const result = await updateScriptSnapshot('', snapshot);

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

    declare module 'graphql-tag' {
      module _unique_module_name {
        type DocumentNode = import('graphql').DocumentNode;

        interface TypedDocumentNode<
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

        interface DocumentMap {
          [${query1.slice(
            4,
            -1
          )}]: TypedDocumentNode<CatalogUserQueryOperation, CatalogUserQueryVariables>;
          [${query2.slice(
            4,
            -1
          )}]: TypedDocumentNode<ChannelTotoQueryOperation, ChannelTotoQueryVariables>;
        }

        type Maybe<T> = T | null;
        type InputMaybe<T> = Maybe<T>;
        type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };
        /** All built-in and custom scalars, mapped to their actual values */
        type Scalars = {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
        };
        
        type User = {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
        };
    
        type Query = {
           __typename?: "Query";
           users: Array<User>;
           user: User;
         };
         
         type QueryUserArgs = {
           id: Scalars["ID"];
         };

         type Maybe<T> = T | null;
         type InputMaybe<T> = Maybe<T>;
         type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
         type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
           [SubKey in K]?: Maybe<T[SubKey]>;
         };
         type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
           [SubKey in K]: Maybe<T[SubKey]>;
         };
         /** All built-in and custom scalars, mapped to their actual values */
         type Scalars = {
           ID: string;
           String: string;
           Boolean: boolean;
           Int: number;
           Float: number;
         };

         type Item = {
           __typename?: "Item";
           id: Scalars["ID"];
           value: Scalars["String"];
         };
        
         type Query = {
           __typename?: "Query";
           toto: Item;
         };
         
          type QueryTotoArgs = {
            id: Scalars["ID"];
          };
    
          type CatalogUserQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type CatalogUserQueryOperation = {
            __typename?: "Query";
            user: { __typename?: "User"; id: string; name: string };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          };
    
          type ChannelTotoQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type ChannelTotoQueryOperation = {
            __typename?: "Query";
            toto: { __typename?: "Item"; id: string; value: string };
          };
      }

      export function gql<Literal extends keyof _unique_module_name.DocumentMap>(
        literals: Literal | readonly string[],
        ...args: any[]
      ): _unique_module_name.DocumentMap[Literal];
    }
  `)
    );
  });

  it('gives updated source with codegen config', async () => {
    const logger = createFakeLogger();

    const createUniqueStringSpy = vi.spyOn(
      createUniqueStringExport,
      'createUniqueString'
    );
    createUniqueStringSpy.mockImplementationOnce(() => '_unique_module_name');

    const updateScriptSnapshot = createSourceUpdater(
      '',
      { graphqlConfigPath: codegenConfigPath },
      logger,
      (err) => {
        throw err;
      }
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

    const result = await updateScriptSnapshot('', snapshot);

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

    declare module 'graphql-tag' {
      module _unique_module_name {
        type DocumentNode = import('graphql').DocumentNode;

        interface TypedDocumentNode<
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

        interface DocumentMap {
          [${query1.slice(
            4,
            -1
          )}]: TypedDocumentNode<UserQueryOperation, UserQueryVariables>;
          [${query2.slice(
            4,
            -1
          )}]: TypedDocumentNode<TotoQueryOperation, TotoQueryVariables>;
        }

        type Maybe<T> = T | null;
        type InputMaybe<T> = Maybe<T>;
        type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
        type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]?: Maybe<T[SubKey]>;
        };
        type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
          [SubKey in K]: Maybe<T[SubKey]>;
        };
        /** All built-in and custom scalars, mapped to their actual values */
        type Scalars = {
          ID: string;
          String: string;
          Boolean: boolean;
          Int: number;
          Float: number;
          DateTime: String;
        };
        
        type User = {
          __typename?: "User";
          id: Scalars["ID"];
          oauthId: Scalars["String"];
          email: Scalars["String"];
          name: Scalars["String"];
          picture?: Maybe<Scalars["String"]>;
          createdAt?: Maybe<Scalars["DateTime"]>;
        };
    
        type Query = {
           __typename?: "Query";
           users: Array<User>;
           user: User;
           toto: User;
         };
         
         type QueryUserArgs = {
           id: Scalars["ID"];
         };
         
          type QueryTotoArgs = {
            id: Scalars["ID"];
          };
    
          type UserQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type UserQueryOperation = {
            __typename?: "Query";
            user: { __typename?: "User"; id: string; name: string };
            users: Array<{ __typename?: "User"; id: string; email: string }>;
          };
    
          type TotoQueryVariables = Exact<{
            id: Scalars["ID"];
          }>;
          
          type TotoQueryOperation = {
            __typename?: "Query";
            toto: { __typename?: "User"; id: string; email: string };
          };
      }

      export function gql<Literal extends keyof _unique_module_name.DocumentMap>(
        literals: Literal | readonly string[],
        ...args: any[]
      ): _unique_module_name.DocumentMap[Literal];
    }
  `)
    );
  });
});
