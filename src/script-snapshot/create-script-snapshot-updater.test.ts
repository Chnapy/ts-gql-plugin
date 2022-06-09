/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable unicorn/consistent-function-scoping */
import fs from 'node:fs';
import ts from 'typescript';
import { Logger } from '../utils/logger';
import { createScriptSnapshotUpdater } from './create-script-snapshot-updater';
import { formatTS } from './test-utils';
import * as createUniqueStringExport from '../utils/create-unique-string';

describe('Create script snapshot updater', () => {
  const initialReadFile = fs.readFile;
  const setFSReadFile = (
    fn: (
      path: string,
      options: any,
      cb: (error: any, data: any) => void
    ) => void
  ) => {
    fs.readFile = Object.assign(fn as any, {
      __promisify__: fn,
    });
  };

  const createFakeLogger = (): Logger => ({
    log: vi.fn(),
    error: vi.fn(),
    verbose: vi.fn(),
    debug: vi.fn(),
  });

  const emptySnapshot = {} as ts.IScriptSnapshot;

  beforeEach(() => {
    setFSReadFile(
      vi.fn((...args) => {
        throw new Error(`fs.readFile should be overriden [${args}]`);
      })
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('gives noop function on any error', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createScriptSnapshotUpdater(
      null as any,
      null as any,
      null as any,
      logger
    );

    expect(logger.error).toHaveBeenCalled();

    expect(await updateScriptSnapshot('', emptySnapshot)).toBe(emptySnapshot);
  });

  it('gives noop function if schema not defined', async () => {
    const logger = createFakeLogger();

    const updateScriptSnapshot = createScriptSnapshotUpdater(
      {
        ScriptSnapshot: {
          fromString: vi.fn(),
        },
      },
      '',
      {},
      logger
    );

    expect(logger.error).toHaveBeenCalled();

    expect(await updateScriptSnapshot('', emptySnapshot)).toBe(emptySnapshot);
  });

  it('gives same snapshot if no occurrence found', async () => {
    const logger = createFakeLogger();

    const schema = `
    type User {
      id: ID!
      oauthId: String!
      email: String!
      name: String!
      picture: String
    }
    
    type Query {
      users: [User!]!
      user(id: ID!): User!
    }
    `;

    const schemaPath = 'foobar';

    setFSReadFile((path, options, cb) => {
      if (path.toString().endsWith(schemaPath)) {
        cb(null, schema);
      }
      initialReadFile(path, options, cb);
    });

    const updateScriptSnapshot = createScriptSnapshotUpdater(
      {
        ScriptSnapshot: {
          fromString: vi.fn(),
        },
      },
      '',
      { schema: schemaPath },
      logger
    );

    const snapshot = ts.ScriptSnapshot.fromString(`
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
    `);

    const result = await updateScriptSnapshot('', snapshot);

    expect(logger.error).not.toHaveBeenCalled();

    expect(result).toBe(snapshot);
  });

  it('gives updated snapshot', async () => {
    const logger = createFakeLogger();

    const schema = `
      type User {
        id: ID!
        oauthId: String!
        email: String!
        name: String!
        picture: String
      }
      
      type Query {
        users: [User!]!
        user(id: ID!): User!
        toto(id: ID!): User!
      }
    `;

    const schemaPath = 'foobar';

    setFSReadFile((path, options, cb) => {
      if (path.toString().endsWith(schemaPath)) {
        cb(null, schema);
      }
      initialReadFile(path, options, cb);
    });

    const createUniqueStringSpy = vi.spyOn(
      createUniqueStringExport,
      'createUniqueString'
    );
    createUniqueStringSpy.mockImplementationOnce(() => '_unique_module_name');

    const updateScriptSnapshot = createScriptSnapshotUpdater(
      ts,
      '',
      { schema: schemaPath },
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

    const snapshot = ts.ScriptSnapshot.fromString(`
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
    `);

    const result = await updateScriptSnapshot('', snapshot);

    expect(logger.error).not.toHaveBeenCalled();

    expect(formatTS(result.getText(0, result.getLength()))).toEqual(
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

          [k: string]: DocumentNode;
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
});
