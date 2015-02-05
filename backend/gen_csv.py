import json
import os
from joblib import Parallel, delayed
import multiprocessing
import logging
# from test_config import datasets


logging.basicConfig(level=logging.WARNING)

force_imgout = False
img_quality = ['half','s1'] # options: 'half', 's1'
imgcount = 0
root = ""

def is_number(s):
	try:
		float(s)
		return True
	except ValueError:
		return False

def read_json(path):
	import json
	import os
	ds = []
	with open(path) as f:
		obj = json.load(f)
		global root
		root = obj['rootfolder']
		for d in obj['datasets']:
			if isinstance(d, basestring):
				ds.append(d)
			else:
				if not 'folders' in d:
					d['folders'] = map(lambda p: os.path.join(root, p), d['subfolders'])
				ds.append(d)
		return ds

def my_parsetime(str):
	from datetime import timedelta,datetime
	try:
		offset = int(str[-5:])
		delta = timedelta(hours = offset / 100)

		fmt = "%Y-%m-%d %H:%M:%S"
		time = datetime.strptime(str[:-6], fmt)
		time -= delta
		return time
	except:
		return None


def readMetadataFolder(folder, pos_subfolder, metaset=False, metaset_idx=None,metaset_dim='pos'):
	from datetime import timedelta
	folderimgcount = 0

	logging.debug('readMetadataFolder(): %s, %s' % (folder, pos_subfolder))
	path = os.path.join(folder, pos_subfolder, 'metadata.txt')
	if not os.path.exists(path):
		logging.info('readMetadataFolder(): metadata.txt not found: %s' % (path))
		return None
	import sys

	sys.stdout.write('.')
	# Read coord from metadata.txt
	res = []
	with open(path) as f:
		try:
			# print path
			obj = json.load(f)
		except Exception as e:
			print "Micromanager metadata bug? (%s)" % path
			try:
				obj = json.loads(f.read()+'}')  # adhoc fix
			except Exception as e:
				print "Still error at %s" % path
				raise e
		fr_keys = obj.keys()
		set_uuid = obj['Summary']['UUID']
		outfolder = os.path.join('..', 'images', set_uuid)
		if not os.path.exists(outfolder):
			os.makedirs(outfolder)
		for fr in fr_keys:
			if fr == 'Summary':
				continue
			chname = obj[fr]['Channel']
			objf = obj[fr]
			frame = objf['FrameIndex']
			etime = objf['ElapsedTime-ms']
			stime = obj['Summary']['Time']
			slice = objf['SliceIndex']
			uuid = objf['UUID'] or (set_uuid+'_'+fr)  # Old MicroManager files do not have UUID for images.
			imgpath = os.path.join(folder, pos_subfolder, 'img_%09d_%s_%03d.tif' % (frame, chname, slice))
			import img_convert
			img_convert.convert_multiple(set_uuid, uuid, imgpath, quality=img_quality, overwrite=force_imgout)
			row = (folder, set_uuid, uuid
			       , stime
			       , objf['PositionIndex']
			       , frame
			       , objf['ChannelIndex']
			       , objf['SliceIndex']
			       , etime
			       , objf['PositionName']
			       , objf['XPositionUm']
			       , objf['YPositionUm']
			       , objf['ZPositionUm']
			       , ""
			       , chname,
					"")
			if metaset:
				if metaset_dim == 'pos':
					row = row + (metaset_idx,0,0,0)
				elif metaset_dim == 'frame':
					row = row + (0,metaset_idx,0,0)
				elif metaset_dim == 'ch':
					row = row + (0,0,metaset_idx,0)
				elif metaset_dim == 'slice':
					row = row + (0,0,0,metaset_idx)
			res.append(row)
	return res, set_uuid, imgcount


def write_to_csv(poss, set_uuid, metaset=False):
	import csv

	csvpath = os.path.join('..', 'metadata', set_uuid + '.csv')
	header = ['folder','set_uuid', 'uuid', 'stime', 'pos', 'frame', 'ch', 'slice', 'time', 'posname', 'x', 'y', 'z', 'framename', 'chname', 'slicename'] +\
	         (['meta_pos','meta_frame','meta_ch','meta_slice'] if metaset else [])
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(header)
		for pos in poss:
			writer.writerow(pos)


def updateDatasets():
	import csv

	csvpath = os.path.join('..', 'datasets.csv')
	with open(csvpath, 'wb') as f:
		writer = csv.writer(f)
		writer.writerow(['uuid', 'name', 'folder', 'metaset', 'images', 'positions','frames','channels','slices', 'metasetdim'])
		for d in sorted(datasets_processed, key=lambda a: a[1]):     # Sorted by name
			writer.writerow(d)


datasets_processed = []


def process_set(dataset, depth=0):
	folder = os.path.join(root, dataset)
	print('Processing set: ' + folder)
	num_cores = multiprocessing.cpu_count()
	poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(folder, subfolder) for subfolder
	                                  in os.listdir(folder) if os.path.isdir(os.path.join(folder, subfolder)))
	poss = [x for x in poss if x is not None]
	print('\n%d metadata.txt files' % len(poss))
	set_uuid = poss[0][1]

	global imgcount
	imgcount += sum(map(lambda a: a[2], poss))

	# Sort by time or position
	sort_by_time = True
	key = 8 if sort_by_time else 4
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, poss))),
	                     key=lambda e: e[key])

	write_to_csv(pos_flatten, set_uuid)

	num_pos = 1 + max(map(lambda a: a[4], pos_flatten))
	num_fr = 1 + max(map(lambda a: a[5], pos_flatten))
	num_ch = 1 + max(map(lambda a: a[6], pos_flatten))
	num_sl = 1 + max(map(lambda a: a[7], pos_flatten))

	import re

	m = re.search('/(\d{6,8}.+?/.+?)/', dataset)
	name = m.group(1) if m else dataset
	datasets_processed.append((set_uuid, name, dataset, 0, len(pos_flatten), num_pos, num_fr, num_ch, num_sl, depth))

	print('\nProcessed: ' + set_uuid)


def process_metaset(ds, depth=0):
	print('Processing metaset: ' + ds['name'])
	num_cores = multiprocessing.cpu_count()

	pos_all = []
	set_uuid = []
	for idx, dataset in enumerate(ds['folders']):
		poss = Parallel(n_jobs=num_cores)(delayed(readMetadataFolder)(dataset, subfolder, metaset=True, metaset_idx=idx,metaset_dim=ds['dimension']) for subfolder
		                                  in os.listdir(dataset) if os.path.isdir(os.path.join(dataset, subfolder)))
		pos_all += [x for x in poss if x is not None]
		global imgcount
		imgcount += sum(map(lambda a: a[2], pos_all))
		if len(pos_all) > 0:
			set_uuid.append(pos_all[0][1])

	# Sort by time or position
	sort_by_time = True
	key = 7 if sort_by_time else 3
	pos_flatten = sorted(reduce(lambda c, d: c + d, map(lambda b: b[0], filter(lambda a: a is not None, pos_all))),
	                     key=lambda e: e[key])

	def calc_dim_metaset(poss, meta_dim, dim):
		m = {'pos': [4,16], 'frame': [5,17], 'ch': [6,18], 'slice': [7,19]}
		if meta_dim != dim:
			return 1 + max(map(lambda a: a[m[dim][0]], poss))
		else:
			# Sort by meta-dim first, then scan through them to get unique coord to find max.
			poss2 = sorted(poss,key=lambda p: p[m[dim][1]])
			max_i = 0
			prv_c = 0
			cur_coord = 0
			max_d = 0
			for pos in poss2:
				if pos[m[dim][1]] != prv_c:
					prv_c = pos[m[dim][1]]
					cur_coord += max_i + 1
					max_i = 0
				max_i = max([max_i,pos[m[dim][0]]])
				max_d = max([max_d,pos[m[dim][0]]+cur_coord])
			return max_d + 1

	num_pos = calc_dim_metaset(pos_flatten, ds['dimension'], 'pos')
	num_fr = calc_dim_metaset(pos_flatten, ds['dimension'], 'frame')
	num_ch = calc_dim_metaset(pos_flatten, ds['dimension'], 'ch')
	num_sl = calc_dim_metaset(pos_flatten, ds['dimension'], 'slice')

	import hashlib

	id = hashlib.sha256(','.join(sorted(set_uuid))).hexdigest()
	write_to_csv(pos_flatten, 'metaset_%s' % (id), metaset=True)

	datasets_processed.append(('metaset_' + id, ds['name'], id,1,len(pos_flatten), num_pos, num_fr, num_ch, num_sl, ds.get('dimension'), depth))

	print('\nProcessed: ' + id)


def search_datasets(datasets, depth=0):
	for d in datasets:
		if isinstance(d, dict):
			try:
				process_metaset(d,depth)
			except:
				pass
		# elif isinstance(d, list):
		# 	search_datasets(d, depth+1)
		else:
			try:
				process_set(d,depth)
			except Exception as e:
				print e
				pass
def main():
	import time
	initial = time.time()
	datasets = read_json("datasets20150203.json")
	search_datasets(datasets)
	updateDatasets()
	final = time.time()
	print('Done. %d images processed (%d images converted). %.1f sec total.' % (sum([d[4] for d in datasets_processed]),imgcount,final-initial))

main()
