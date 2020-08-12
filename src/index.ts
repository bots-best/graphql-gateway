import { ApolloGateway } from '@apollo/gateway';
import { ApolloServer } from 'apollo-server-koa';
import responseCachePlugin from 'apollo-server-plugin-response-cache';
import depthLimit from 'graphql-depth-limit';
import Koa from 'Koa';
import KoaRouter from 'koa-router';
import cors from '@koa/cors';
import helmet from 'koa-helmet';
import compression from 'koa-compress';
import koaPlayground from 'graphql-playground-middleware-koa';

const serviceList = process.env['GRAPHQL_ENDPOINT_LIST']?.split(',').map(tupleString => {
	const tuple = tupleString.split(' ');
	return {
		name: tuple[0],
		url: tuple[1]
	};
});

if (serviceList === undefined) throw new Error('missing "GRAPHQL_ENDPOINT_LIST" enviroment variable');


const gateway = new ApolloGateway({
	serviceList
});


(async () => {
	const { executor, schema } = await gateway.load();

	const app = new Koa();

	const router = new KoaRouter();

	const server = new ApolloServer({
		schema,
		playground: false,
		subscriptions: false,
		executor,
		validationRules: [depthLimit(5)],
		plugins: [responseCachePlugin(), {
			requestDidStart: context => {
			  if (context.request.http?.headers.get('X-Reload-Gateway')) {
				  gateway.load().catch(console.error);
				}
			}
		}]
	});

	app.use(cors());

	app.use(helmet());

	app.use(compression());

	server.applyMiddleware({ app });

	router.all(
		'/playground',
		koaPlayground({
		  endpoint: '/graphql'
		})
	);

	app.use(router.routes());

	app.use(router.allowedMethods());

	const port = Number(process.env.GATEWAY_PORT ?? 8081);

	app.listen({ port }, () => console.log(`🚀 Server ready at http://localhost:${port}${server.graphqlPath}`));
})().catch(console.error);
